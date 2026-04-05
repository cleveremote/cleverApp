import { io, Socket } from 'socket.io-client';
import { initSSL } from './SSLConfig';

export type SocketEventCallback = (...args: unknown[]) => void;

class SocketService {
	private socket: Socket | null = null;
	private sslReady = false;

	/**
	 * Initialize the socket connection.
	 * Calls initSSL() to set up CA trust before connecting.
	 *
	 * @param url    - The server URL to connect to (e.g. https://api.example.com:443)
	 * @param token  - The auth token for socket authentication
	 * @param extraHeaders - Optional extra headers (e.g. { boxId: '...' })
	 */
	async init(
		url: string,
		token: string,
		extraHeaders?: Record<string, string>
	): Promise<void> {
		// Ensure SSL trust is initialized before any connection
		if (!this.sslReady) {
			await initSSL();
			this.sslReady = true;
		}

		// Disconnect any existing connection
		if (this.socket?.connected) {
			this.socket.disconnect();
		}
    console.log('extraHeaders', extraHeaders);
		this.socket = io(url, {
			forceNew: false,
			transports: ['websocket'],
			rejectUnauthorized: true,
			auth: { token },
			...(extraHeaders ? { extraHeaders } : {})
		});
	}

	/**
	 * Emit an event to the server.
	 */
	emit(event: string, ...args: unknown[]): void {
		this.socket?.emit(event, ...args);
	}

	/**
	 * Listen for an event from the server.
	 */
	on(event: string, callback: SocketEventCallback): void {
		this.socket?.on(event, callback);
	}

	/**
	 * Remove a specific event listener.
	 */
	off(event: string, callback?: SocketEventCallback): void {
		if (callback) {
			this.socket?.off(event, callback);
		} else {
			this.socket?.off(event);
		}
	}

	/**
	 * Disconnect the socket.
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
	}

	/**
	 * Update the auth token on the existing socket.
	 */
	updateAuthToken(token: string): void {
		if (this.socket) {
			(this.socket.auth as Record<string, string>).token = token;
		}
	}

	/**
	 * Reconnect the socket (disconnect then connect).
	 */
	reconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket.connect();
		}
	}

	/**
	 * Connect the socket (useful after a previous disconnect).
	 */
	connect(): void {
		this.socket?.connect();
	}

	/**
	 * Returns the underlying Socket.IO instance (if needed for advanced use).
	 */
	getSocket(): Socket | null {
		return this.socket;
	}

	/**
	 * Returns true if the socket is currently connected.
	 */
	get connected(): boolean {
		return this.socket?.connected ?? false;
	}

	/**
	 * Returns true if the socket is active (reconnecting automatically).
	 */
	get active(): boolean {
		return this.socket?.active ?? false;
	}
}

export default new SocketService();
