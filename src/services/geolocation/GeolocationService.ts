import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type LocalCoordinates = {
	longitude: number;
	latitude: number;
};

/**
 * Ce que l'on sait de l'autorisation de localisation :
 *  - 'granted'  : position obtenue (l'accès est ouvert, pour cette session au
 *                 moins — « Autoriser une fois » compris).
 *  - 'denied'   : refus définitif, seuls les réglages système peuvent le lever.
 *                 Rien ne sert de redemander : l'OS n'affichera plus la popup.
 *  - 'unknown'  : jamais demandé, ou refus temporaire (Android) : la popup peut
 *                 encore s'afficher.
 */
export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied';

export type LocalCoordinatesResult = {
	coordinates?: LocalCoordinates;
	status: LocationPermissionStatus;
};

// Code d'erreur natif d'un refus (RNCPositionErrorDenied / PERMISSION_DENIED).
const PERMISSION_DENIED = 1;

// Dernier statut observé, partagé par tous les écrans : un refus constaté sur
// un écran masque aussi le bouton ailleurs, sans nouvelle tentative. Volontaire-
// ment en mémoire seulement : l'utilisateur peut rouvrir l'accès depuis les
// réglages système, un statut persisté masquerait le bouton pour toujours.
let lastKnownStatus: LocationPermissionStatus = 'unknown';

export const getLocationPermissionStatus = (): LocationPermissionStatus =>
	lastKnownStatus;

// iOS : c'est le natif qui demande l'autorisation, au moment du
// `getCurrentPosition` (d'où `skipPermissionRequests: false`). Deux raisons :
//  - `requestAuthorization` ne rappelle ses callbacks que depuis le delegate
//    `locationManagerDidChangeAuthorization`. Quand le statut est déjà connu, le
//    delegate ne se redéclenche pas : ni success ni error n'est appelé et la
//    promesse reste bloquée pour toujours (le refresh ne marchait qu'une fois).
//  - « Autoriser une fois » repasse à « non déterminé » dès que l'app quitte le
//    premier plan. Seul le natif sait qu'il faut réafficher la popup ; un flag
//    d'autorisation mémorisé côté JS l'en empêcherait et le refresh échouerait
//    silencieusement jusqu'au redémarrage de l'app.
// `getCurrentPosition` rappelle toujours (succès, erreur ou timeout natif), donc
// aucun appel ne peut rester en attente.
Geolocation.setRNConfiguration({
	skipPermissionRequests: false,
	authorizationLevel: 'whenInUse',
	locationProvider: 'auto'
});

/**
 * Android only: ask for the fine location permission.
 * Never throws. Un simple « Refuser » reste 'unknown' (la popup peut revenir),
 * seul « Ne plus demander » passe en 'denied'.
 * On iOS the permission prompt is handled natively by `getCurrentPosition`.
 */
export const requestLocationPermission =
	async (): Promise<LocationPermissionStatus> => {
		if (Platform.OS !== 'android') {
			return 'unknown';
		}

		if (!PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
			return 'denied';
		}

		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
		);
		if (granted === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
		return granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
			? 'denied'
			: 'unknown';
	};

/**
 * Read the current GPS position of the phone, along with what the attempt says
 * about the permission (see `LocationPermissionStatus`).
 * Never throws and never blocks the caller for more than `timeoutMs`:
 * returns no coordinates when the permission is denied, the GPS is off or the
 * fix times out, so callers can carry on without them.
 *
 * `timeoutMs` couvre aussi le temps de réponse de l'utilisateur à la popup
 * d'autorisation iOS, d'où une valeur par défaut généreuse.
 */
export const readLocalCoordinates = async (
	timeoutMs = 20000,
	// Un rafraîchissement explicite passe 0 pour forcer un nouveau point GPS
	// plutôt que de récupérer le dernier fix en cache.
	maximumAgeMs = 60000
): Promise<LocalCoordinatesResult> => {
	const remember = (result: LocalCoordinatesResult) => {
		// Un timeout ou un GPS coupé ('unknown') ne doit pas effacer un refus
		// déjà constaté : seul un vrai verdict met le statut à jour.
		if (result.status !== 'unknown') lastKnownStatus = result.status;
		return result;
	};

	try {
		const androidStatus = await requestLocationPermission();
		if (androidStatus === 'denied') {
			return remember({status: 'denied'});
		}

		return await new Promise<LocalCoordinatesResult>(resolve => {
			Geolocation.getCurrentPosition(
				position =>
					resolve(
						remember({
							status: 'granted',
							coordinates: {
								longitude: position.coords.longitude,
								latitude: position.coords.latitude
							}
						})
					),
				error => {
					console.warn('Unable to get position', error?.message);
					resolve(
						remember({
							status:
								error?.code === PERMISSION_DENIED
									? 'denied'
									: 'unknown'
						})
					);
				},
				{
					enableHighAccuracy: true,
					timeout: timeoutMs,
					maximumAge: maximumAgeMs
				}
			);
		});
	} catch (error) {
		console.warn('Unable to get position', error);
		return {status: 'unknown'};
	}
};

/** Position seule, pour les appelants que le statut n'intéresse pas. */
export const getLocalCoordinates = async (
	timeoutMs = 20000,
	maximumAgeMs = 60000
): Promise<LocalCoordinates | undefined> =>
	(await readLocalCoordinates(timeoutMs, maximumAgeMs)).coordinates;

export type PendingCoordinates = {
	/** La position si elle est arrivée dans `graceMs`, sinon `undefined`. */
	take: (graceMs: number) => Promise<LocalCoordinates | undefined>;
};

/**
 * Lance la recherche de position tout de suite, pour n'en récupérer le résultat
 * que plus tard et sans jamais bloquer longtemps.
 *
 * Fait pour les écrans d'appairage, qui joignent la position à une
 * configuration mais n'en dépendent pas. Attendre `getLocalCoordinates` au
 * moment d'envoyer coûtait jusqu'à 20 s : il lui faut un point GPS, et à côté
 * d'une box — en intérieur, sur un réseau sans internet donc sans assistance
 * A-GPS — il ne l'obtient généralement pas et va au bout de son délai pour ne
 * rien rapporter. Sur Android 13+ s'y ajoute la popup ACCESS_FINE_LOCATION, que
 * l'appairage n'a pas demandée par ailleurs.
 *
 * Démarrée à l'affichage de l'écran, l'attente se superpose à la saisie du
 * formulaire et la popup arrive pendant qu'il y a encore quelque chose à lire.
 * `take` ne fait ensuite que constater le résultat.
 */
export const startLocalCoordinates = (
	timeoutMs?: number,
	maximumAgeMs?: number
): PendingCoordinates => {
	// La promesse est lancée sans qu'on sache si elle sera consommée — quitter
	// l'écran avant de valider est un usage normal. Sans ce `catch`, un rejet
	// n'aurait alors personne pour le recevoir.
	const pending = getLocalCoordinates(timeoutMs, maximumAgeMs).catch(error => {
		console.warn('Unable to get position', error);
		return undefined;
	});

	return {
		take: graceMs => {
			const expiry = new Promise<undefined>(resolve =>
				setTimeout(() => resolve(undefined), graceMs)
			);
			return Promise.race([pending, expiry]);
		}
	};
};
