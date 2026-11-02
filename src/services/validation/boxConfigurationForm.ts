/**
 * Validation du formulaire de configuration de la box.
 *
 * Séparé de l'écran pour deux raisons : il est testable seul, et la même règle
 * de mot de passe s'appliquera aux autres écrans qui en créent un.
 */

export type BoxConfigurationForm = {
	/**
	 * Nom donné à la box. Il l'identifie partout ensuite : profil enregistré,
	 * `boxId` du socket, service mDNS.
	 */
	deviceName: string;
	/** SSID du réseau Wi-Fi que la box doit rejoindre. */
	ssid: string;
	/** Clé du réseau ci-dessus. */
	psk: string;
	/** Identifiant du compte créé sur la box — une adresse email. */
	login: string;
	password: string;
	confirmPassword: string;
};

/**
 * Motif d'un refus, sous forme de code : le texte affiché est traduit par
 * l'écran (`access:validation.<code>`, avec `{min: PASSWORD_MIN_LENGTH}`).
 */
export type BoxConfigurationIssue =
	| 'emailRequired'
	| 'emailInvalid'
	| 'passwordRequired'
	| 'passwordTooShort'
	| 'passwordWeak'
	| 'deviceNameRequired'
	| 'ssidRequired'
	| 'pskRequired'
	| 'confirmRequired'
	| 'passwordMismatch';

export type BoxConfigurationErrors = Partial<
	Record<keyof BoxConfigurationForm, BoxConfigurationIssue>
>;

/** Longueur minimale du mot de passe de la box. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Volontairement large : la seule chose qui compte ici est qu'une adresse
 * manifestement invalide ne parte pas jusqu'à la box. La RFC 5322 complète
 * rejetterait des adresses pourtant délivrables.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** '' quand l'adresse est acceptable, sinon le motif du refus. */
export function emailIssue(value: string): BoxConfigurationIssue | '' {
	const email = value.trim();
	if (!email) return 'emailRequired';
	if (!EMAIL_PATTERN.test(email)) return 'emailInvalid';
	return '';
}

/**
 * '' quand le mot de passe est acceptable, sinon le motif du refus.
 *
 * Ce mot de passe protège l'accès à la box : il est exigé au moins aussi long
 * que la règle habituelle, et mélangé, sans imposer de caractère spécial —
 * ce dernier fait surtout produire des mots de passe notés sur un papier.
 */
export function passwordIssue(value: string): BoxConfigurationIssue | '' {
	if (!value) return 'passwordRequired';
	if (value.length < PASSWORD_MIN_LENGTH)
		return 'passwordTooShort';
	if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value))
		return 'passwordWeak';
	return '';
}

/**
 * Erreurs du formulaire, champ par champ. Un champ absent du résultat est
 * valide ; un objet vide veut dire que le formulaire est envoyable.
 *
 * Tous les champs sont obligatoires.
 */
export function validateBoxConfiguration(
	form: BoxConfigurationForm
): BoxConfigurationErrors {
	const errors: BoxConfigurationErrors = {};

	if (!form.deviceName.trim()) errors.deviceName = 'deviceNameRequired';
	if (!form.ssid) errors.ssid = 'ssidRequired';
	if (!form.psk) errors.psk = 'pskRequired';

	const login = emailIssue(form.login);
	if (login) errors.login = login;

	const password = passwordIssue(form.password);
	if (password) {
		errors.password = password;
	}

	// Le champ de confirmation ne reproche rien tant que le mot de passe
	// lui-même est refusé : une seule erreur à corriger à la fois.
	if (!form.confirmPassword) {
		errors.confirmPassword = 'confirmRequired';
	} else if (!password && form.confirmPassword !== form.password) {
		errors.confirmPassword = 'passwordMismatch';
	}

	return errors;
}

/** Vrai quand {@link validateBoxConfiguration} n'a rien trouvé à redire. */
export function isBoxConfigurationValid(
	errors: BoxConfigurationErrors
): boolean {
	return Object.keys(errors).length === 0;
}
