import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from "base-64";
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { EventEmitter } from 'events';
import { io, Socket, SocketOptions } from "socket.io-client";
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { WEBSITE_URL, WEBSITE_URL_LOCAL } from "../../../../config/websocket";
import { CONFIGURATION_LOAD, UPDATE_CONFIGURATION, UPDATE_STATUS } from "../../../module/process/infrasctructure/store/actions/types";
import * as Keychain from 'react-native-keychain';

class AuthenticationService {
  public newEvent = new EventEmitter();
  public socketChangeEvent = new EventEmitter();
  private timeout: NodeJS.Timeout | undefined;;
  private timeout2: NodeJS.Timeout | undefined;;
  public socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
  private isLocalRouter = true;
  constructor() {
    global.atob = decode;
  }

  public getIsTokenExpired(token: string) {
    global.atob = decode;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp;

    } catch (error) {
      console.log('error', error);
    }
  }

  public async dispatchExpireTokenEvent(token: string) {

    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    const exp = this.getIsTokenExpired(token);
    if ((exp && exp < Date.now() / 1000) || !exp) {
      await this.executeRefresh();
    } else {
      this.newEvent.emit("isExpired", false);
      this.timeout = setTimeout(async () => {
        await this.executeRefresh();
      }, (exp - (Date.now() / 1000)) * 1000);
    }
  }

  public async executeRefresh() {
    if (this.timeout2) {
      clearTimeout(this.timeout2);
    }
    console.log("executeRefresh");
    const rt = await AsyncStorage.getItem('refreshToken');
    if (!rt) {
      if (this.socket) {
        this.socket.disconnect();
      }
      this.newEvent.emit("isExpired", true);

      return;
    }

    if (!this.socket) {
      this.socket = await this.setSocketServer();
    }

    if (this.socket && !this.socket.connected) {
      console.log('this.socket && !this.socket.connected',this.socket,!this.socket.connected)
      this.socket.connect();
    }
    this.timeout2 = setTimeout(async () => {
      if (this.socket && this.socket.connected) {

        const exp = this.getIsTokenExpired(rt);
        if ((exp && exp < Date.now() / 1000) || !exp) {
          const res = await this.refreshToken();
          console.log('res', res)
          if (!res.res) {
            this.socket.disconnect();
            this.newEvent.emit("isExpired", {res:true,reson:"!res.res"});
          } else {
            this.newEvent.emit("isExpired", false);
          }
        }
      } else {
        this.socket.disconnect();
        this.newEvent.emit("isExpired", {res:true,reson:"else disco"});

      }
    }, 500);

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
    this.newEvent.emit("isExpired", true);
  }

  // try first local if ok else distant
  private async setSocketServer(isLocal: boolean = true, fromLogin: boolean = false): Promise<Socket> {
    const server = isLocal ? WEBSITE_URL_LOCAL : WEBSITE_URL;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(`${server}`, {
      timeout: 2000,
      forceNew: false,
      auth: {
        token: await AsyncStorage.getItem('accessToken') ?? ""
      },
      extraHeaders: {
        boxId: await AsyncStorage.getItem('boxId') ?? ""
      }
    });

    const connect = (socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined): Promise<{ res: boolean, error?: string, retry?: boolean }> => {
      return new Promise((resolve, reject) => {
        socket?.on("connect_error", async (error) => {
          if (socket?.active && (!fromLogin && !isLocal)) {
            console.log("socket?.active", error)
            resolve({ res: false, error: 'timeout', retry: true });
          } else {
            console.log("else socket?.active", error)
            resolve({ res: false, error: 'timeout' });
          }
        });
        socket?.on("connect", () => {
          resolve({ res: true });
        });
      })
    };

    const connectionRes = await connect(this.socket);
    if (!connectionRes.res && connectionRes.retry) {
      return await this.setSocketServer(!isLocal, fromLogin);
    }
    return this.socket;
  }


  public manageReconnexion() {
    this.socket?.on("disconnect", async (reason) => {
      console.log('reason', reason, Math.random());
      if (reason !== "io client disconnect") {
        this.socket = await this.setSocketServer();
      }
    });
    this.socket?.on("connect", () => {
      console.log('reconnection ', Math.random());
    });
  }

  public async Login(data: any, isLocal: boolean = true): Promise<{ res: boolean, error?: string }> {
    this.socket = await this.setSocketServer(true, true);
    this.manageReconnexion();
    const sendLogin = (): Promise<{ res: boolean, error?: string }> => {
      return new Promise((resolve, reject) => {
        if (!this.socket?.connected) {
          resolve({ res: false, error: "No server connexion!" });
        }
        this.socket?.emit('front/box/login', data, async (response: any) => {
          if (response.error) {
            // @ts-ignore: this.socket  will never be undefinied here
            this.socket.disconnect();
            console.log('errr', response)
            resolve({ res: false, error: response.error });
          } else {
            console.log(response);
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

  public listenEvent(callback: (message: any) => void, type: string) {
    if (this.socket) {
      if (type === UPDATE_CONFIGURATION) {
        this.socket.on(UPDATE_CONFIGURATION, message => {
          callback(message);
        });
      }
      if (type === UPDATE_STATUS) {
        this.socket.on('front/synchronize/status', message => {
          callback(message);
        });
      }
    }
  }

  startConnexionLiteners(data: any, socket: Socket) {
    if (socket) {
      // client
      socket.on('error', function (err) {
        console.log(err);
      });
      socket.on("connect_error", async (error) => {
        console.log("(socket:error 1)", error.message);
        if (error.message === "timeout") {
          socket.disconnect();
          await this.Login(data, !this.isLocalRouter);
        }
        if (socket?.active) {
          // temporary failure, the socket will automatically try to reconnect
          socket.disconnect();
          await this.Login(data, !this.isLocalRouter);
        } else {

          // the connection was denied by the server
          // in that case, `socket.connect()` must be manually called in order to reconnect
          console.log("(socket:error)", error.message);
        }
      });
    }
  }

  // // testing purposes
  // const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // try {
  //     // custom logic
  //     await sleep(2000);
  //     const token = '';

  // } finally {
  //     setIsLoading(false);
  // }




  // async  getAccessUsingRefresh (refreshToken) {
  //   return fetch(URL, {
  //     method: 'POST',

  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify(refreshToken)
  //   }).then(res => res.json())
  // }
  public sendNewTokent(token) {
    this.newEvent.emit("newToken", token);
  }
  async getVerifiedKeys(keys) {
    console.log('Loading keys from storage')

    if (keys) {
      console.log('checking access')

      if (!this.isTokenExpired(keys.access)) {
        console.log('returning access')

        return keys
      } else {
        console.log('access expired')

        console.log('checking refresh expiry')

        if (!this.isTokenExpired(keys.refresh)) {
          console.log('fetching access using refresh')

          //const response = await this.getAccessUsingRefresh(keys.refresh)

          //await AsyncStorage.setItem('keys', JSON.stringify("response"))

          console.log('UPDATED ONE')

          return "response"
        } else {
          console.log('refresh expired, please login')

          return null
        }
      }
    } else {
      console.log('access not available please login')

      return null
    }
  }

  isTokenExpired(token) {
    var decoded = jwtDecode(token)

    if (decoded.exp < Date.now() / 1000) {
      return true
    } else {
      return false
    }
  }

  async setCredentials(keys) {
    try {
      //await AsyncStorage.setItem('keys', JSON.stringify(keys))
    } catch (e) {
      console.log(e)
    }
  }

  async getCredentials() {
    try {
      // let credentials = await AsyncStorage.getItem('keys')

      // let cred = await this.getVerifiedKeys(JSON.parse(credentials))

      // if (credentials != null && cred != null) {
      //   return cred
      // } else {
      //   return null
      // }
    } catch (e) {
      console.log(e)
    }

    return null
  }
  getSocket() {
    return this.socket
  }
}
export const AuthVerify = new AuthenticationService()