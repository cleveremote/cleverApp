import AsyncStorage from '@react-native-async-storage/async-storage';
import {decode} from 'base-64';
import {jwtDecode} from 'jwt-decode';
import {EventEmitter} from 'events';
import {io, Socket} from 'socket.io-client';
import {DefaultEventsMap} from '@socket.io/component-emitter';
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
import {NetworkInfo} from 'react-native-network-info';
import {Platform} from 'react-native';
class AuthenticationService {
	public newEvent = new EventEmitter();
	public socketChangeEvent = new EventEmitter();
	private timeout: NodeJS.Timeout | undefined;
	private timeout2: NodeJS.Timeout | undefined;
	public socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
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
		if (this.timeout2) {
			clearTimeout(this.timeout2);
		}
		const rt = await AsyncStorage.getItem('refreshToken');
		if (!rt) {
			if (this.socket) {
				this.socket.disconnect();
			}
			this.setIsExpired(true);
			return;
		}

		if (!this.socket) {
			this.socket = await this.setSocketServer();
		}

		if (this.socket && !this.socket.connected) {
			this.socket.connect();
		}
		this.timeout2 = setTimeout(async () => {
			const tok = await AsyncStorage.getItem('accessToken');
			if (!!this.socket?.connected && tok) {
				const exp = this.getIsTokenExpired(tok);
				if ((exp && exp < Date.now() / 1000) || !exp) {
					const res = await this.refreshToken();
					if (!res.res) {
						this.socket.disconnect();
						this.setIsExpired(true);
					} else {
						this.setIsExpired(false);
					}
				}
			} else {
				this.setIsExpired(true);
				this.socket?.disconnect();
			}
		}, 500);
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
			socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined,
			refreshToken: string
		): Promise<{res: boolean; error?: string}> => {
			return new Promise((resolve, _reject) => {
				socket?.emit(
					'front/box/refreshtoken',
					refreshToken,
					async (response: any) => {
						if (response.error) {
							// @ts-ignore: this.socket  will never be undefinied here
							this.socket.disconnect();
							resolve({res: false, error: response.error});
						} else {
							await this.saveTokens(response);
							// @ts-ignore: this.socket  will never be undefinied here
							socket.auth.token = response.accessToken;
							// @ts-ignore: this.socket  will never be undefinied here
							socket.disconnect().connect();
							// @ts-ignore: this.socket  will never be undefinied here
							this.dispatchExpireTokenEvent(response.accessToken);
							resolve({res: true});
						}
					}
				);
			});
		};
		const refreshToken = (await AsyncStorage.getItem('refreshToken')) ?? '';
		return await refresh(this.socket, refreshToken);
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
		this.socket?.disconnect();
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
		const ip = await NetworkInfo.getIPV4Address();
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
	private async setSocketServer(isLocal = true, login = ''): Promise<Socket> {
		const boxId = login ?? (await AsyncStorage.getItem('boxId'));
		//if android

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
		} 	else {	
			server = WEBSITE_URL;
		}			

		if (this.socket) {
			this.socket.disconnect();
		}

		this.socket = io(`${server}`, {
			forceNew: false,
			requestTimeout: 1000,
			transports: ['websocket'],
			auth: {
				token: (await AsyncStorage.getItem('accessToken')) ?? ''
			},
			extraHeaders: {
				boxId: login ?? (await AsyncStorage.getItem('boxId'))
			}
		});

		const connect = (
			socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined
		): Promise<{res: boolean; error?: string; retry?: boolean}> => {
			return new Promise((resolve, _reject) => {
				socket?.on('connect_error', async _error => {
					if (socket?.active && !login && !isLocal) {
						resolve({res: false, error: 'timeout', retry: true});
					} else if (login && isLocal) {
						resolve({res: false, error: 'timeout', retry: true});
					} else {
						this.setStatusServer(false);
						resolve({res: false, error: 'timeout'});
					}
				});
				socket?.on('connect', () => {
					this.setStatusServer(true);
					resolve({res: true});
				});

				socket?.on('disconnect', reason => {
					this.setStatusServer(false);
					if (reason !== 'io client disconnect') {
						this.signout();
					}
				});
			});
		};

		const connectionRes = await connect(this.socket);
		if (!connectionRes.res && connectionRes.retry) {
			return await this.setSocketServer(!isLocal, login);
		}

		return this.socket;
	}

	public manageReconnexion() {
		this.socket?.on('disconnect', async reason => {
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
		this.socket = await this.setSocketServer(true, login);
		if (!this.socket) {
			return {res: false};
		}
		const sendLogin = (): Promise<{res: boolean; error?: string}> => {
			return new Promise((resolve, _reject) => {
				if (!this.socket?.connected) {
					resolve({res: false, error: 'No server connexion!'});
				}
				this.socket?.emit(
					'front/box/login',
					{login, password},
					async (response: any) => {
						if (response.error) {
							// @ts-ignore: this.socket  will never be undefinied here
							this.socket.disconnect();
							resolve({res: false, error: response.error});
						} else {
							await this.saveTokens(response);
							// @ts-ignore: this.socket  will never be undefinied here
							// @ts-ignore: this.socket  will never be undefinied here
							this.socket.auth.token = response.accessToken;
							// @ts-ignore: this.socket  will never be undefinied here
							this.socket.disconnect().connect();
							// @ts-ignore: this.socket  will never be undefinied here

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
