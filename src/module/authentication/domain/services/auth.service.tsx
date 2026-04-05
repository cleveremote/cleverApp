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
import NetInfo from '@react-native-community/netinfo';
import {Platform} from 'react-native';
class AuthenticationService {
	public newEvent = new EventEmitter();
	public socketChangeEvent = new EventEmitter();
	private timeout: NodeJS.Timeout | undefined;
	private lastStatus = false;

	constructor() {
		global.atob = decode;
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
				await this.setSocketServer();
			} else {
				await new Promise<void>((resolve) => {
					const cleanup = () => {
						socketService.off('connect', onConnect);
						socketService.off('connect_error', onError);
					};
					const onConnect = () => { cleanup(); this.setStatusServer(true); resolve(); };
					const onError = () => { cleanup(); this.setStatusServer(false); resolve(); };
					socketService.on('connect', onConnect);
					socketService.on('connect_error', onError);
					socketService.connect();
				});
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
		this.setIsExpired(true);
	}

	private getBaseHostname(url: string) {
		const match = url.match(/\/\/([^:/]+)/);
		const t = match ? match[1].split('.')[0] : null;
		return t;
	}

	private async findServer(localServer: string): Promise<string | undefined> {
		console.log('Scanning local network for server...');
		const netState = await NetInfo.fetch();
		const ip = (netState.details as {ipAddress?: string} | null)?.ipAddress ?? null;
		console.log('Scanning local network for server...',ip);
		if (!ip) return undefined;

		const rootIp = ip.replace(/\.\d+$/, '.');

		const tryHost = async (i: number): Promise<string> => {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 500);
			try {
				console.log(`http://${rootIp}${i}:3000/ping`);
				const res = await fetch(`http://${rootIp}${i}:3000/ping`, {signal: controller.signal});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const r = await res.json().catch(() => res.text());
				if (r?.name === localServer) return `http://${rootIp}${i}:5001`;
				throw new Error('no match');
			} finally {
				clearTimeout(timer);
			}
		};

		// Scan all hosts in parallel — total time = timeout (500ms) instead of 254 × 500ms
		return new Promise(resolve => {
			let remaining = 254;
			for (let i = 1; i <= 254; i++) {
				tryHost(i)
					.then(url => resolve(url))
					.catch(() => {
						if (--remaining === 0) resolve(undefined);
					});
			}
		});
	}

	// try first local if ok else distant
	private async setSocketServer(isLocal = true, login = ''): Promise<void> {
		const boxId = login || (await AsyncStorage.getItem('boxId')) || '';

		let server = WEBSITE_URL;

		if (isLocal && Platform.OS === 'android') {
			console.log('testing local server');
			server =
				this.getBaseHostname(
					DEV_MODE
						? WEBSITE_URL_LOCAL
						: `http://${boxId.slice(-8)}.local:5001`
				) ?? '';
			server = (await this.findServer(server)) ?? '';
		} else if (isLocal) {
			server = WEBSITE_URL_LOCAL;
		} else {
			server = WEBSITE_URL;
		}

		const token = (await AsyncStorage.getItem('accessToken')) ?? '';
		const extraHeaders = {
			boxId
		};

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

	public manageReconnexion() {
		socketService.on('disconnect', async (reason: unknown) => {
			this.setStatusServer(false);
			if (reason !== 'io client disconnect') {
				this.signout();
			}
		});
	}

	public async Login(
		login: string,
		password: string,
		_isLocal = true
	): Promise<{res: boolean; error?: string}> {
		this.reset();
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
