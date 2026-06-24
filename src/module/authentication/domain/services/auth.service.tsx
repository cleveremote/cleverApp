import AsyncStorage from '@react-native-async-storage/async-storage';
import {decode} from 'base-64';
import {jwtDecode} from 'jwt-decode';
import {EventEmitter} from 'events';
import {socketService} from '../../../../services/socket';
import {
	DEV_MODE,
	WEBSITE_URL,
	WEBSITE_URL_LOCAL
} from '../../../../../config/websocket';
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
		const rt = await AsyncStorage.getItem('refreshToken');
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

		const tok = await AsyncStorage.getItem('accessToken');
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
		const refreshToken = (await AsyncStorage.getItem('refreshToken')) ?? '';
		return await refresh(refreshToken);
	}

	private async saveTokens(tokens: any): Promise<void> {
		try {
			await AsyncStorage.setItem('refreshToken', tokens.refreshToken);
			await AsyncStorage.setItem('accessToken', tokens.accessToken);
		} catch (error) {
			console.error('Error storing tokens:', error);
		}
	}

	public async signout() {
		socketService.disconnect();
		await AsyncStorage.removeItem('refreshToken');
		await AsyncStorage.removeItem('accessToken');
		this.resolvedLocalService = null;
		this.setIsExpired(true);
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

		console.log('Resolving local server via mDNS:', boxId);
		const service = await mdnsResolver.resolveService(boxId);
		if (!service) {
			console.log('mDNS resolution failed for', boxId);
			return undefined;
		}
		console.log('Resolved', boxId, '->', service.hostname, service.ip);
		this.resolvedLocalService = service;
		return service;
	}

	private async resolveLocalServer(boxId: string): Promise<string | undefined> {
		const service = await this.scanAndCacheLocalService(boxId);
		if (!service) return undefined;
		return `https://${service.hostname}.local`;
	}

	// try first local if ok else distant
	private async setSocketServer(isLocal = true, login = ''): Promise<void> {
		const boxId = login || (await AsyncStorage.getItem('boxId')) || '';

		let server = WEBSITE_URL;

		if (isLocal) {
			server = (await this.resolveLocalServer(boxId)) ?? '';
		} else {
			server = WEBSITE_URL;
		}

		const token = (await AsyncStorage.getItem('accessToken')) ?? '';
		const extraHeaders = {
			boxId
		};
        console.log('Connecting to server at', server, 'with boxId', boxId, 'and token', token)
		await socketService.init(server, token, extraHeaders);

		const connectResult = (): Promise<{res: boolean; error?: string; retry?: boolean}> => {
			return new Promise((resolve, _reject) => {
				socketService.on('connect_error', async (_error: any) => {
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
					this.setStatusServer(false);
					if (reason !== 'io client disconnect') {
						this.signout();
					}
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
	): Promise<{res: boolean; error?: string}> {
		this.reset();
		// Force a fresh mDNS scan for this login session — the cached host
		// from a previous session must not be reused on a new login.
		this.resolvedLocalService = null;
		await this.setSocketServer(true, login);
		const sendLogin = (): Promise<{res: boolean; error?: string}> => {
			return new Promise((resolve, _reject) => {
				if (!socketService.connected) {
					resolve({res: false, error: 'No server connexion!'});
				}
				socketService.emit(
					'front/box/login',
					{login, password},
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
		return await sendLogin();
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
