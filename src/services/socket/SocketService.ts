import { io, Socket } from 'socket.io-client';
import { initSSL } from './SSLConfig';
import { pendingRequests } from './pendingRequests';

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
			try {
				await initSSL();
			} catch (e) {
				// Without the CA anchor every TLS handshake to the box will fail —
				// surface it here rather than letting it look like a network error.
				console.log('initSSL failed:', (e as Error)?.message ?? e);
				throw e;
			}
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
		// Coupure réseau ou côté box : les acks en attente sont perdus.
		this.socket.on('disconnect', () => pendingRequests.releaseAll());
	}

	/**
	 * Emit an event to the server.
	 * A trailing ack callback marks a request awaiting the box's response: it is
	 * tracked by `pendingRequests` so the global loader shows until it answers.
	 */
	emit(event: string, ...args: unknown[]): void {
		if (!this.socket) return;
		const last = args[args.length - 1];
		if (typeof last === 'function') {
			args[args.length - 1] = pendingRequests.track(
				event,
				last as (...a: unknown[]) => unknown
			);
		}
		this.socket.emit(event, ...args);
	}

	/**
	 * Same as `emit`, without the global loader: for background refreshes of
	 * data already on screen, or requests whose screen shows its own loader
	 * (e.g. a busy button).
	 */
	emitSilent(event: string, ...args: unknown[]): void {
		this.socket?.emit(event, ...args);
	}

	/**
	 * Reload of a list: global loader only while the list is still empty (first
	 * entry on a screen); a refresh of data already on screen stays silent.
	 */
	emitRefresh(hasData: boolean, event: string, ...args: unknown[]): void {
		if (hasData) {
			this.emitSilent(event, ...args);
		} else {
			this.emit(event, ...args);
		}
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
	 * Pause the socket (disconnect but keep the instance alive for reconnection).
	 */
	pause(): void {
		if (this.socket?.connected) {
			this.socket.disconnect();
		}
		pendingRequests.releaseAll();
	}

	/**
	 * Disconnect the socket and destroy the instance.
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
		}
		pendingRequests.releaseAll();
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
			pendingRequests.releaseAll();
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
