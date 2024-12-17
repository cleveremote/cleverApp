import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from "base-64";
import { jwtDecode } from 'jwt-decode';
import { EventEmitter } from 'events';
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { DEV_MODE, WEBSITE_URL, WEBSITE_URL_LOCAL } from "../../../../../config/websocket";
import { SET_BOX_CONNECTED, SET_CONNECTED, SET_SERVER_CONNECTED } from '../../../process/infrasctructure/store/actions/types';
import { store } from '../../../process/infrasctructure/store/store';

class AuthenticationService {
    public newEvent = new EventEmitter();
    public socketChangeEvent = new EventEmitter();
    private timeout: NodeJS.Timeout | undefined;;
    private timeout2: NodeJS.Timeout | undefined;;
    public socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
    private lastStatus: boolean = false;

    constructor() {
        setInterval(() => {
            if (!this.lastStatus && this.socket?.connected) {
                console.log("connected");
                this.setStatusServer(true);

            }

            if (this.lastStatus && !this.socket?.connected) {
                console.log("disconnected");
                this.setStatusServer(false);
            }
            this.lastStatus = !!this.socket?.connected;

        }, 1000);
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
            }, (exp - (Date.now() / 1000)) * 1000);
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

        const refresh = (socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined, refreshToken: string): Promise<{ res: boolean, error?: string }> => {
            return new Promise((resolve, reject) => {
                socket?.emit('front/box/refreshtoken', refreshToken, async (response: any) => {
                    if (response.error) {
                        // @ts-ignore: this.socket  will never be undefinied here
                        this.socket.disconnect();
                        resolve({ res: false, error: response.error });
                    } else {
                        await this.saveTokens(response);
                        // @ts-ignore: this.socket  will never be undefinied here
                        socket.auth.token = response.accessToken;
                        socket?.disconnect();
                        socket?.connect();
                        //this.socket = await this.setSocketServer(true, response.accessToken);
                        // @ts-ignore: this.socket  will never be undefinied here
                        this.dispatchExpireTokenEvent(response.accessToken);
                        resolve({ res: true });
                    }
                })
            });
        }
        const refreshToken = await AsyncStorage.getItem('refreshToken') ?? "";
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

    // try first local if ok else distant
    private async setSocketServer(isLocal: boolean = true, login: string = ""): Promise<Socket> {
        const boxId = login ?? await AsyncStorage.getItem('boxId');
        let server = isLocal ? boxId.slice(-8) + ".local" : WEBSITE_URL;
        if (DEV_MODE) {
            server = isLocal ? WEBSITE_URL_LOCAL : WEBSITE_URL;
        }

        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(`${server}`, {
            forceNew: false,
            transports: ['websocket'],
            auth: {
                token: await AsyncStorage.getItem('accessToken') ?? ""
            },
            extraHeaders: {
                boxId: login ?? await AsyncStorage.getItem('boxId')
            }
        });

        const connect = (socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined): Promise<{ res: boolean, error?: string, retry?: boolean }> => {
            return new Promise((resolve, reject) => {
                socket?.on("connect_error", async (error) => {
                    console.log(error);
                    if (socket?.active && (!login && !isLocal)) {
                        console.log("je suis ici");
                        resolve({ res: false, error: 'timeout', retry: true });
                    } else if (login && isLocal) {
                        console.log("je suis ici 1");
                        resolve({ res: false, error: 'timeout', retry: true });
                    } else {
                        console.log("je suis ici 2");
                        this.setStatusServer(false);
                        resolve({ res: false, error: 'timeout' });
                    }
                });
                socket?.on("connect", () => {
                    console.log("je suis ici 3");
                    this.setStatusServer(true);
                    resolve({ res: true });
                });

                socket?.on("disconnect", () => {

                    this.setStatusServer(true);
                    resolve({ res: true });
                });
            })
        };

        const connectionRes = await connect(this.socket);
        if (!connectionRes.res && connectionRes.retry) {
            return await this.setSocketServer(!isLocal, login);
        }

        return this.socket;
    }


    public manageReconnexion() {
        this.socket?.on("disconnect", async (reason) => {
            console.log("disconnect", reason)
            this.setStatusServer(false);
            if (reason !== "io client disconnect") {
                this.socket = await this.setSocketServer();
            }
        });
        // this.socket?.on("connect", () => {
        //     this.setStatusServer(true);
        // });
    }

    public async Login(login: string, password: string, isLocal: boolean = true): Promise<{ res: boolean, error?: string }> {
        this.socket = await this.setSocketServer(true, login);
        this.manageReconnexion();
        const sendLogin = (): Promise<{ res: boolean, error?: string }> => {
            return new Promise((resolve, reject) => {
                if (!this.socket?.connected) {
                    resolve({ res: false, error: "No server connexion!" });
                }
                this.socket?.emit('front/box/login', { login, password }, async (response: any) => {
                    if (response.error) {
                        // @ts-ignore: this.socket  will never be undefinied here
                        this.socket.disconnect();
                        resolve({ res: false, error: response.error });
                    } else {
                        await this.saveTokens(response);
                        // @ts-ignore: this.socket  will never be undefinied here
                        this.socket.auth.token = response.accessToken;
                        this.socket?.disconnect();
                        this.socket?.connect();
                        // @ts-ignore: this.socket  will never be undefinied here

                        this.dispatchExpireTokenEvent(response.accessToken);
                        resolve({ res: true });
                    }
                });
            })
        };
        return await sendLogin();

    }

    private setStatusBox(value: boolean) {
        store.dispatch({
            type: SET_BOX_CONNECTED,
            payload: value,
        });
    }

    private setStatusServer(value: boolean) {
        store.dispatch({
            type: SET_SERVER_CONNECTED,
            payload: value,
        });
    }

    private setStatusLoggin(value: boolean) {
        store.dispatch({
            type: SET_CONNECTED,
            payload: value,
        });
    }



    public setIsExpired(value: boolean) {
        //this.setStatusBox(!value);
        console.log("setStatusServer", !value);
        this.setStatusServer(!value);
        this.setStatusLoggin(!value);
    }
}
export const authenticationService = new AuthenticationService()