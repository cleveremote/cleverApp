import {deviceTimeZone} from '../../../../../services/time';

/**
 * Fuseau IANA de la box (`settings.timeZone`), dans lequel elle interprète
 * tous ses crons. Box antérieure à ce réglage, ou settings pas encore
 * chargés : celui du téléphone, comme avant.
 */
export const selectBoxTimeZone = (state: any): string =>
	state.root_settings?.settings?.timeZone || deviceTimeZone();

/** Coordonnées de la box (`settings.localCoordinates`), si connues. */
export const selectBoxCoordinates = (
	state: any
): {latitude: number; longitude: number} | undefined => {
	const c = state.root_settings?.settings?.localCoordinates;
	const latitude = Number(c?.latitude);
	const longitude = Number(c?.longitude);
	return c?.latitude != null &&
		c?.longitude != null &&
		Number.isFinite(latitude) &&
		Number.isFinite(longitude)
		? {latitude, longitude}
		: undefined;
};

/**
 * Email de récupération du compte (`account.email` de la configuration, à
 * défaut `settings.recoveryEmail`), si connu.
 */
export const selectRecoveryEmail = (state: any): string | undefined => {
	const email =
		state.root_settings?.account?.email ??
		state.root_settings?.settings?.recoveryEmail;
	return typeof email === 'string' && email ? email : undefined;
};
