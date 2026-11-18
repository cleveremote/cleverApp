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
	/**
	 * Identifiant de la box : c'est lui le vrai login de connexion, celui que
	 * l'écran de connexion redemandera (« Identifiant de la box »). Non saisi :
	 * c'est le `deviceId` du QR scanné, sans le `.local`.
	 */
	boxIdentifier: string;
	/** Email de récupération du compte créé sur la box. Facultatif. */
	email: string;
	/**
	 * Mot de passe de l'étiquette, demandé en mode `setup` comme preuve de
	 * possession, une fois la box sur le réseau : son étape le vérifie auprès
	 * d'elle (`checkPassword`) avant de passer au compte. Inutile en
	 * `recovery`, qui ne fait que changer de réseau.
	 */
	currentPassword: string;
	/** Nouveau mot de passe, obligatoire en mode `setup`. */
	password: string;
	confirmPassword: string;
};

/**
 * Les deux modes de la box où elle accepte une configuration (`getMode`).
 *
 * - `setup` : box neuve ou réinitialisée — tout est à renseigner, et le mot de
 *   passe de l'étiquette doit être remplacé.
 * - `recovery` : box déjà configurée qui a perdu son Wi-Fi — seul le réseau
 *   est à refaire.
 */
export type BoxConfigurationMode = 'setup' | 'recovery';

/**
 * Étapes de l'assistant, dans l'ordre. La première fait rejoindre le réseau à
 * la box ; tout ce qui suit lui parle sur ce réseau. Le mode `recovery`
 * s'arrête là : la box garde son compte.
 */
export type BoxConfigurationStep = 'wifi' | 'ownership' | 'account';

export const BOX_CONFIGURATION_STEPS: Record<
	BoxConfigurationMode,
	BoxConfigurationStep[]
> = {
	setup: ['wifi', 'ownership', 'account'],
	recovery: ['wifi']
};

export type BoxConfigurationOptions = {
	/**
	 * Le réseau choisi est déjà connu de la box (`isConfigured`) : elle en a la
	 * clé, qui n'est plus à ressaisir.
	 */
	pskOptional?: boolean;
	/**
	 * La box garde le mot de passe qu'elle a aujourd'hui : pas de nouveau mot
	 * de passe à saisir.
	 */
	keepCurrentPassword?: boolean;
};

/** Champs saisis à chaque étape. */
export function fieldsOfStep(
	step: BoxConfigurationStep
): (keyof BoxConfigurationForm)[] {
	switch (step) {
		case 'wifi':
			return ['boxIdentifier', 'ssid', 'psk'];
		case 'account':
			return ['deviceName', 'email', 'password', 'confirmPassword'];
		case 'ownership':
			return ['currentPassword'];
	}
}

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
	| 'boxIdentifierRequired'
	| 'ssidRequired'
	| 'pskRequired'
	| 'confirmRequired'
	| 'passwordMismatch'
	| 'currentPasswordRequired'
	| 'currentPasswordWrong';

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
 * En `setup`, tout est obligatoire sauf l'email, y compris le nouveau mot de
 * passe. En `recovery`, seul le réseau l'est.
 */
export function validateBoxConfiguration(
	form: BoxConfigurationForm,
	mode: BoxConfigurationMode,
	options: BoxConfigurationOptions = {}
): BoxConfigurationErrors {
	const errors: BoxConfigurationErrors = {};

	if (!form.ssid) errors.ssid = 'ssidRequired';
	if (!form.psk && !options.pskOptional) errors.psk = 'pskRequired';
	if (!form.boxIdentifier.trim())
		errors.boxIdentifier = 'boxIdentifierRequired';

	if (mode === 'recovery') return errors;

	if (!form.currentPassword)
		errors.currentPassword = 'currentPasswordRequired';

	if (!form.deviceName.trim()) errors.deviceName = 'deviceNameRequired';

	// Facultatif : vérifié seulement s'il est renseigné.
	if (form.email.trim()) {
		const email = emailIssue(form.email);
		if (email) errors.email = email;
	}

	if (options.keepCurrentPassword) return errors;

	// Le nouveau mot de passe peut être l'actuel : le garder est un choix
	// laissé à l'utilisateur.
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

/** Erreurs restreintes aux champs d'une étape. */
export function stepErrors(
	errors: BoxConfigurationErrors,
	step: BoxConfigurationStep
): BoxConfigurationErrors {
	const result: BoxConfigurationErrors = {};
	for (const field of fieldsOfStep(step)) {
		if (errors[field]) result[field] = errors[field];
	}
	return result;
}

/** Vrai quand {@link validateBoxConfiguration} n'a rien trouvé à redire. */
export function isBoxConfigurationValid(
	errors: BoxConfigurationErrors
): boolean {
	return Object.keys(errors).length === 0;
}
