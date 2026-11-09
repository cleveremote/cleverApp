import AsyncStorage from '@react-native-async-storage/async-storage';
import {decode} from 'base-64';
import {jwtDecode} from 'jwt-decode';
import {EventEmitter} from 'events';
import i18n from 'i18next';
import {socketService} from '../../../../services/socket';
import {WEBSITE_URL} from '../../../../../config/websocket';
import {
	RESET_STORE,
	SET_BOX_CONNECTED,
	SET_CONNECTED,
	SET_SERVER_CONNECTED
} from '../../../process/infrasctructure/store/actions/types';
import {store} from '../../../process/infrasctructure/store/store';
import {
	mdnsResolver,
	ResolvedService
} from '../../../../services/mdns/mdnsResolver';
import {getBoxEndpoint} from '../../../../services/hotspot';
import * as tokenStorage from './tokenStorage';

const USER_NAME_KEY = 'userName';
/** Attente maximale de la réponse de la box à une action sur le compte. */
const ACCOUNT_ACTION_TIMEOUT_MS = 15000;

/** Résultat d'un appel `front/box/login` (connexion ou récupération). */
export type BoxLoginResult = {
	res: boolean;
	/** Message à afficher, déjà traduit par la box (langue des réglages globaux). */
	error?: string;
	/** Statut métier renvoyé par la box, ex. `RECOVERY_CODE_INVALID`. */
	status?: string;
	failedAttempts?: number;
	attemptsRemaining?: number;
	/** Fin du blocage du compte (ms), après trop de tentatives échouées. */
	lockedUntil?: number;
};

// Statuts d'échec de la box : `{success: false, status, message, failedAttempts,
// attemptsRemaining}`.
const FAILURE_STATUS = /INVALID|EXPIRED|LOCKED|BLOCKED|FAIL|ERROR|DENIED|TOO_MANY|NOT_FOUND|MISSING|REQUIRED/i;

const RESULT_KEYS = ['success', 'res', 'status', 'error', 'message', 'accessToken'];

const toObject = (value: unknown): any => {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		return {error: value};
	}
};

/**
 * Trouve l'objet résultat parmi les arguments de l'ack : le premier argument
 * peut être `null` (style `(err, data)`), et le résultat peut être enveloppé
 * dans `data` / `result` / `payload`.
 */
const pickResult = (args: unknown[]): any => {
	const candidates = args.map(toObject).filter(a => a && typeof a === 'object');
	for (const candidate of candidates) {
		if (RESULT_KEYS.some(key => key in candidate)) return candidate;
		for (const wrapper of ['data', 'result', 'payload']) {
			const inner = toObject(candidate[wrapper]);
			if (inner && typeof inner === 'object' && RESULT_KEYS.some(key => key in inner)) {
				return inner;
			}
		}
	}
	return candidates[0];
};

const parseLockedUntil = (value: unknown): number | undefined => {
	if (typeof value !== 'string' && typeof value !== 'number') return undefined;
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? undefined : time;
};

/**
 * Normalise la réponse de `front/box/login`. La box répond soit à l'ancienne
 * (`{res: false, error}`), soit `{success, status, message, failedAttempts,
 * attemptsRemaining}` ; le message arrive déjà dans la langue de l'utilisateur.
 */
const parseBoxLoginResponse = (...args: unknown[]): BoxLoginResult => {
	const response = pickResult(args);
	const status: string | undefined =
		typeof response?.status === 'string' ? response.status : undefined;
	const explicitSuccess = response?.success === true || response?.res === true;
	const failed =
		!response ||
		response.success === false ||
		response.res === false ||
		!!response.error ||
		(!explicitSuccess &&
			((status !== undefined && FAILURE_STATUS.test(status)) ||
				typeof response.attemptsRemaining === 'number'));
	if (!failed) {
		return {res: true, status};
	}
	const error = response?.error;
	const message: string =
		(typeof response?.message === 'string' && response.message) ||
		(typeof error === 'string' && error) ||
		error?.message ||
		i18n.t('common:errors.unexpected');
	return {
		res: false,
		error: message,
		status,
		failedAttempts: response?.failedAttempts,
		attemptsRemaining: response?.attemptsRemaining,
		lockedUntil: parseLockedUntil(response?.lockedUntil)
	};
};

/**
 * Connexion à pré-remplir après une déconnexion (cf. `signout`) : login,
 * profil qui le mémorise, et le nouveau mot de passe qui vient d'être choisi.
 */
export type PendingSignin = {
	login: string;
	profile?: string;
	password?: string;
};

class AuthenticationService {
	public newEvent = new EventEmitter();
	public socketChangeEvent = new EventEmitter();
	private timeout: NodeJS.Timeout | undefined;
	private lastStatus = false;
	/**
	 * Service resolved via mDNS at login time. Cached for the whole session so
	 * every subsequent socket (re)connect reuses the same host without
	 * re-scanning. Cleared on signout or on a new login.
	 */
	private resolvedLocalService: ResolvedService | null = null;
	// Connexion à ouvrir après une déconnexion (changement de mot de passe) :
	// login, et profil qui le mémorise s'il y en a un. Lue une seule fois par
	// l'écran des profils.
	private pendingSignin: PendingSignin | null = null;
	/**
	 * Blocages de compte en cours (`ACCOUNT_LOCKED`), par identifiant de box :
	 * conservés hors des écrans pour que le blocage survive à une navigation.
	 */
	private accountLocks = new Map<string, {until: number; message?: string}>();

	/** Blocage en cours pour cet identifiant, ou `null` s'il n'y en a pas / plus. */
	public getAccountLock(login: string): {until: number; message?: string} | null {
		const lock = this.accountLocks.get(login.trim());
		if (!lock) return null;
		if (lock.until <= Date.now()) {
			this.accountLocks.delete(login.trim());
			return null;
		}
		return lock;
	}

	private recordAccountLock(login: string, result: BoxLoginResult) {
		if (result.lockedUntil && result.lockedUntil > Date.now()) {
			this.accountLocks.set(login.trim(), {
				until: result.lockedUntil,
				message: result.error
			});
		} else if (result.res) {
			this.accountLocks.delete(login.trim());
		}
	}

	constructor() {
		global.atob = decode;
	}

	/** Exposes the mDNS service resolved during the current session's login. */
	public getResolvedLocalService(): ResolvedService | null {
		return this.resolvedLocalService;
	}

	public async dispatchExpireTokenEvent(token: string) {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		const exp = this.getIsTokenExpired(token);
		if ((exp && exp < Date.now() / 1000) || !exp) {
			await this.executeRefresh();
		} else {
			this.setIsExpired(false);
			this.timeout = setTimeout(async () => {
				await this.executeRefresh();
			}, (exp - Date.now() / 1000) * 1000);
		}
	}

	public async executeRefresh() {
		const rt = await tokenStorage.getRefreshToken();
		if (!rt) {
			socketService.disconnect();
			this.setIsExpired(true);
			return;
		}

		if (!socketService.connected) {
			if (!socketService.getSocket()) {
				// Socket was fully destroyed (e.g. after signout) — recreate from scratch
				await this.setSocketServer();
			} else {
				// Socket exists but is disconnected (e.g. after pause) — try to reconnect with timeout
				await new Promise<void>((resolve) => {
					const timeout = setTimeout(() => {
						cleanup();
						this.setStatusServer(false);
						resolve();
					}, 8000);
					const cleanup = () => {
						clearTimeout(timeout);
						socketService.off('connect', onConnect);
						socketService.off('connect_error', onError);
					};
					const onConnect = () => { cleanup(); this.setStatusServer(true); resolve(); };
					const onError = () => { cleanup(); this.setStatusServer(false); resolve(); };
					socketService.on('connect', onConnect);
					socketService.on('connect_error', onError);
					socketService.connect();
				});

				// If still not connected after resume attempt, recreate from scratch
				if (!socketService.connected) {
					socketService.disconnect();
					await this.setSocketServer();
				}
			}
		}

		const tok = await tokenStorage.getAccessToken();
		if (socketService.connected && tok) {
			const exp = this.getIsTokenExpired(tok);
			if ((exp && exp < Date.now() / 1000) || !exp) {
				const res = await this.refreshToken();
				if (!res.res) {
					socketService.disconnect();
					this.setIsExpired(true);
				} else {
					this.setIsExpired(false);
				}
			}
		} else {
			this.setIsExpired(true);
			socketService.disconnect();
		}
	}

	public getIsTokenExpired(token: string) {
		global.atob = decode;
		try {
			const decoded = jwtDecode(token);
			return decoded.exp;
		} catch (error) {
			return 0;
		}
	}

	public async refreshToken() {
		const refresh = (
			refreshToken: string
		): Promise<{res: boolean; error?: string}> => {
			return new Promise((resolve, _reject) => {
				socketService.emit(
					'front/box/refreshtoken',
					refreshToken,
					async (response: any) => {
						if (response.error) {
							socketService.disconnect();
							resolve({res: false, error: response.error});
						} else {
							await this.saveTokens(response);
							socketService.updateAuthToken(response.accessToken);
							socketService.reconnect();
							this.dispatchExpireTokenEvent(response.accessToken);
							resolve({res: true});
						}
					}
				);
			});
		};
		const refreshToken = await tokenStorage.getRefreshToken();
		return await refresh(refreshToken);
	}

	private async saveTokens(tokens: any): Promise<void> {
		try {
			await tokenStorage.saveTokens(tokens);
		} catch (error) {
			console.error('Error storing tokens:', error);
		}
	}

	// Login de l'utilisateur connecté (gardé au login, survit au refresh
	// token), envoyé au box comme auteur des commandes. Session ouverte avant
	// qu'on le garde : on le relit dans les claims du token d'accès.
	public async getCurrentUserName(): Promise<string | undefined> {
		const stored = await AsyncStorage.getItem(USER_NAME_KEY);
		if (stored) {
			return stored;
		}
		const token = await tokenStorage.getAccessToken();
		if (!token) {
			return undefined;
		}
		try {
			global.atob = decode;
			const claims: any = jwtDecode(token);
			const name = [
				claims.username,
				claims.login,
				claims.name,
				claims.user,
				claims.sub
			].find(v => typeof v === 'string' && v);
			if (name) {
				await AsyncStorage.setItem(USER_NAME_KEY, name);
			}
			return name;
		} catch {
			return undefined;
		}
	}

	/**
	 * Ferme la session. `next` : on atterrit directement sur l'écran de
	 * connexion, ce login (et son profil) pré-remplis (cf.
	 * `takePendingSignin`).
	 */
	public async signout(next?: PendingSignin) {
		socketService.disconnect();
		await tokenStorage.clearTokens();
		await AsyncStorage.removeItem(USER_NAME_KEY);
		this.resolvedLocalService = null;
		this.pendingSignin = next?.login ? next : null;
		this.setIsExpired(true);
	}

	/** Connexion laissée par `signout(next)`, rendue une seule fois. */
	public takePendingSignin(): PendingSignin | null {
		const next = this.pendingSignin;
		this.pendingSignin = null;
		return next;
	}

	private parseLocalUrl(url: string): {hostname: string; port: string} {
		const match = url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/);
		return {
			hostname: match?.[1] ?? '',
			port: match?.[2] ?? '443'
		};
	}

	/**
	 * Scan mDNS once for the service matching the given boxId and cache it.
	 * Subsequent calls within the same session return the cached service
	 * without re-scanning — the host only changes on a new login.
	 */
	private async scanAndCacheLocalService(
		boxId: string
	): Promise<ResolvedService | undefined> {
		if (this.resolvedLocalService) {
			return this.resolvedLocalService;
		}

		const service = await mdnsResolver.resolveService(boxId);
		if (!service) {
			console.warn('mDNS resolution failed for', boxId);
			return undefined;
		}
		this.resolvedLocalService = service;
		return service;
	}

	private async resolveLocalServer(boxId: string): Promise<string | undefined> {
		// Always keep the `.local` hostname: the box certificate is issued for
		// `DNS:pi-dev-1.local` only, so connecting by IP would lose hostname
		// verification. Android has no system mDNS resolver — the name→address
		// lookup is redirected natively instead (see CustomOkHttpClientFactory).

		// A box paired by QR code told us its hostname and port outright, so
		// there is nothing to discover. The URL keeps the same `.local` shape as
		// the mDNS branch below, which is what keeps the certificate valid.
		const endpoint = await getBoxEndpoint(boxId);
		if (endpoint) {
			return `https://${endpoint.host}:${endpoint.port}`;
		}
		const service = await this.scanAndCacheLocalService(boxId);
		if (!service) return undefined;
		// The box advertises the port it actually listens on — fall back to the
		// default https port only when it is missing from the SRV record.
		const port = service.port ? `:${service.port}` : '';
		return `https://${service.hostname}.local${port}`;
	}

	// try first local if ok else distant
	private async setSocketServer(isLocal = true, login = ''): Promise<void> {
		if(login) {
			await AsyncStorage.setItem('boxId', login);
		}
		const boxId = (await AsyncStorage.getItem('boxId')) || '';

		let server = WEBSITE_URL;

		if (isLocal) {
			server = (await this.resolveLocalServer(boxId)) ?? '';
		} else {
			server = WEBSITE_URL;
		}

		const token = await tokenStorage.getAccessToken();
		const extraHeaders = {
			boxId
		};
		await socketService.init(server, token, extraHeaders);

		const connectResult = (): Promise<{res: boolean; error?: string; retry?: boolean}> => {
			return new Promise((resolve, _reject) => {
				socketService.on('connect_error', async (_error: any) => {
					console.warn(
						'connect_error on', server, '->',
						_error?.message ?? _error,
						'| native:', _error?.description?.message ?? '(aucun)',
						'| cause:', _error?.cause ?? '(aucune)'
					);
					if (socketService.active && !login && !isLocal) {
						resolve({res: false, error: 'timeout', retry: true});
					} else if (login && isLocal) {
						resolve({res: false, error: 'timeout', retry: true});
					} else {
						this.setStatusServer(false);
						resolve({res: false, error: 'timeout'});
					}
				});
				socketService.on('connect', () => {
					this.setStatusServer(true);
					resolve({res: true});
				});

				socketService.on('disconnect', (reason: unknown) => {
					// Déconnexion volontaire (pause en arrière-plan, reconnect) :
					// passer le serveur à déconnecté démonterait tout le
					// Tab.Navigator (AppStack), et les écrans repartiraient de zéro
					// au retour. L'échec de la reconnexion est géré par
					// executeRefresh et le timeout d'AppStack.
					if (reason === 'io client disconnect') {
						return;
					}
					this.setStatusServer(false);
					this.signout();
				});
			});
		};

		const connectionRes = await connectResult();
		if (!connectionRes.res && connectionRes.retry) {
			await this.setSocketServer(!isLocal, login);
		}
	}

	public async Login(
		login: string,
		password: string,
		_isLocal = true
	): Promise<BoxLoginResult> {
		this.reset();
		// Force a fresh mDNS scan for this login session — the cached host
		// from a previous session must not be reused on a new login.
		this.resolvedLocalService = null;
		
		await this.setSocketServer(true, login);
		const sendLogin = (): Promise<BoxLoginResult> => {
			return new Promise((resolve, _reject) => {
				if (!socketService.connected) {
					resolve({res: false, error: i18n.t('common:errors.noServer')});
				}
				socketService.emit(
					'front/box/login',
					{login, password},
					async (...ackArgs: unknown[]) => {
						const result = parseBoxLoginResponse(...ackArgs);
						const response = pickResult(ackArgs);
						this.recordAccountLock(login, result);
						if (!result.res || !response?.accessToken) {
							socketService.disconnect();
							resolve(
								result.res
									? {
											res: false,
											error: i18n.t('common:errors.unexpected')
									  }
									: result
							);
						} else {
							await this.saveTokens(response);
							await AsyncStorage.setItem(USER_NAME_KEY, login);
							socketService.updateAuthToken(response.accessToken);
							socketService.reconnect();
							this.dispatchExpireTokenEvent(response.accessToken);
							resolve({res: true});
						}
					}
				);
			});
		};
		return await sendLogin();
	}

	/**
	 * Récupération du mot de passe, par le même événement que la connexion
	 * (`front/box/login` avec `isRecovery: true`). La box distingue l'étape aux
	 * champs présents :
	 * - `{login}` seul : envoie un code à l'email de récupération ;
	 * - `+ code` : vérifie le code ;
	 * - `+ code + newPassword` : remplace le mot de passe.
	 * Aucun jeton n'est enregistré : l'utilisateur se reconnecte ensuite avec
	 * son nouveau mot de passe.
	 */
	private async sendRecovery(payload: {
		login: string;
		code?: string;
		newPassword?: string;
	}): Promise<BoxLoginResult> {
		if (!socketService.connected) {
			this.resolvedLocalService = null;
			await this.setSocketServer(true, payload.login);
		}
		return new Promise(resolve => {
			if (!socketService.connected) {
				resolve({res: false, error: i18n.t('common:errors.noServer')});
				return;
			}
			socketService.emit(
				'front/box/login',
				{...payload, isRecovery: true},
				(...ackArgs: unknown[]) => {
					const result = parseBoxLoginResponse(...ackArgs);
					this.recordAccountLock(payload.login, result);
					resolve(result);
				}
			);
		});
	}

	public requestRecoveryCode(login: string) {
		return this.sendRecovery({login});
	}

	public verifyRecoveryCode(login: string, code: string) {
		return this.sendRecovery({login, code});
	}

	public resetPassword(login: string, code: string, newPassword: string) {
		return this.sendRecovery({login, code, newPassword});
	}

	/**
	 * Action sur le compte de la session en cours, sur le socket déjà ouvert.
	 * La box répond au même format que `front/box/login` ; sans réponse dans
	 * le délai (box qui ne connaît pas l'événement…), on abandonne plutôt que
	 * de laisser l'écran attendre indéfiniment.
	 */
	private emitAccountAction(
		event: string,
		payload: Record<string, unknown>
	): Promise<BoxLoginResult> {
		return new Promise(resolve => {
			if (!socketService.connected) {
				resolve({res: false, error: i18n.t('common:errors.noServer')});
				return;
			}
			const timer = setTimeout(
				() => resolve({res: false, error: i18n.t('common:errors.unexpected')}),
				ACCOUNT_ACTION_TIMEOUT_MS
			);
			socketService.emit(event, payload, (...ackArgs: unknown[]) => {
				clearTimeout(timer);
				resolve(parseBoxLoginResponse(...ackArgs));
			});
		});
	}

	/** Envoie un code (OTP) au nouvel email de récupération, pour le vérifier. */
	public requestRecoveryEmailCode(login: string, email: string) {
		return this.emitAccountAction('front/box/send/verificationcode', {
			login,
			email
		});
	}

	/** Vérifie le code reçu sur le nouvel email, sans encore l'enregistrer. */
	public verifyRecoveryEmailCode(login: string, email: string, code: string) {
		return this.emitAccountAction('front/box/check/verificationcode', {
			login,
			email,
			code
		});
	}

	/**
	 * Enregistre les changements du compte de la session
	 * (`front/box/sync/account`) : le mot de passe actuel (`password`)
	 * confirme l'opération. Seuls les champs modifiés sont envoyés : `email` (avec le
	 * `code` qui prouve que l'adresse est vérifiée) et/ou `newPassword`.
	 */
	public syncAccount(
		login: string,
		password: string,
		changes: {email?: string; code?: string; newPassword?: string}
	) {
		return this.emitAccountAction('front/box/sync/account', {
			login,
			password,
			...changes
		});
	}

	/** Remplace l'email de récupération (adresse vérifiée par `code`). */
	public changeRecoveryEmail(
		login: string,
		password: string,
		email: string,
		code: string
	) {
		return this.syncAccount(login, password, {email, code});
	}

	/** Remplace le mot de passe, sans code (OTP). */
	public changePassword(
		login: string,
		password: string,
		newPassword: string
	) {
		return this.syncAccount(login, password, {newPassword});
	}

	/**
	 * Réinitialise sur la box les données (cycles, programmations…) et/ou le
	 * compte ; l'appelant déconnecte ensuite si le compte est effacé.
	 */
	public resetAccount(
		login: string,
		scope: {data: boolean; account: boolean}
	) {
		return this.emitAccountAction('front/box/reset/account', {
			login,
			...scope
		});
	}

	/** Ferme le socket ouvert sans session pour la récupération. */
	public endRecovery() {
		socketService.disconnect();
		this.resolvedLocalService = null;
	}

	private setStatusServer(value: boolean) {
		store.dispatch({
			type: SET_SERVER_CONNECTED,
			payload: value
		});
	}

	private setStatusLoggin(value: boolean) {
		store.dispatch({
			type: SET_CONNECTED,
			payload: value
		});
	}

	public setIsExpired(value: boolean) {
		this.setStatusServer(!value);
		this.setStatusLoggin(!value);
	}

	public reset() {
		store.dispatch({
			type: RESET_STORE
		});
	}
}
export const authenticationService = new AuthenticationService();
