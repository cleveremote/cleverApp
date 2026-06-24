import Zeroconf, { ImplType } from 'react-native-zeroconf';
export interface ResolvedService {
	/** Full host advertised by the service, e.g. `abc12345.local` */
	host: string;
	/** Bare hostname (without `.local`), e.g. `abc12345` */
	hostname: string;
	/** Resolved IP address (IPv4 if available, otherwise host) */
	ip: string;
	/** Service port if advertised */
	port?: number;
	/** Service name as advertised */
	name: string;
}

/**
 * Resolves a `.local` hostname to a full service descriptor using mDNS/Bonjour.
 *
 * Both iOS (via NSNetServiceBrowser) and Android (via NsdManager) support
 * Bonjour browsing — so we discover services and match by host name. This
 * lets Android resolve `.local` hostnames the same way iOS does natively.
 */
class MdnsResolver {
	private zeroconf: Zeroconf | null = null;

	private getInstance(): Zeroconf {
		if (!this.zeroconf) {
			this.zeroconf = new Zeroconf();
		}
		return this.zeroconf;
	}

	/**
	 * Find the service whose host or name matches the given target.
	 *
	 * @param hostname  Bare hostname (without `.local`), e.g. `pi-dev-1`
	 * @param serviceType  Bonjour service type, default `https`
	 * @param protocol  `tcp` or `udp`, default `tcp`
	 * @param timeoutMs  How long to wait before giving up
	 */
	public async resolveService(
		hostname: string,
		serviceType = 'https',
		protocol: 'tcp' | 'udp' = 'tcp',
		timeoutMs = 5000
	): Promise<ResolvedService | undefined> {
		const zc = this.getInstance();
		const target = hostname.toLowerCase().replace(/\.local\.?$/, '');

		return new Promise(resolve => {
			let settled = false;

			const cleanup = () => {
				zc.removeAllListeners();
				try {
					zc.stop();
				} catch (_e) {
					// ignore
				}
			};

			const finish = (service: ResolvedService | undefined) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				cleanup();
				resolve(service);
			};

			const timer = setTimeout(() => finish(undefined), timeoutMs);

			zc.on('resolved', (service: any) => {
				const serviceHost: string = (service?.host ?? '').toLowerCase();
				const serviceName: string = (service?.name ?? '').toLowerCase();
				const matches =
					serviceHost.replace(/\.local\.?$/, '') === target ||
					serviceName === target;
				if (matches) {
					const ip =
						service?.addresses?.find((a: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(a)) ??
						service?.host;
					finish({
						host: serviceHost,
						hostname: serviceHost.replace(/\.local\.?$/, ''),
						ip,
						port: service?.port,
						name: serviceName
					});
				}
			});

			zc.on('error', (_err: any) => {
				finish(undefined);
			});

			try {
				zc.scan(serviceType, protocol, 'local.', ImplType.DNSSD);
			} catch (_e) {
				finish(undefined);
			}
		});
	}
}

export const mdnsResolver = new MdnsResolver();
