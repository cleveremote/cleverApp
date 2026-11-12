import {
	BoxConfigurationForm,
	isBoxConfigurationValid,
	stepErrors,
	validateBoxConfiguration
} from '../src/services/validation';

const complete: BoxConfigurationForm = {
	deviceName: 'Jardin',
	ssid: 'Livebox-1234',
	psk: 'cle-wifi',
	boxIdentifier: 'pi-dev-1',
	email: '',
	currentPassword: 'etiquette1',
	password: 'nouveau123',
	confirmPassword: 'nouveau123'
};

describe('validateBoxConfiguration — setup', () => {
	it('accepte un formulaire complet', () => {
		expect(validateBoxConfiguration(complete, 'setup')).toEqual({});
	});

	it('exige le mot de passe de l’étiquette', () => {
		const errors = validateBoxConfiguration(
			{...complete, currentPassword: ''},
			'setup'
		);
		expect(errors.currentPassword).toBe('currentPasswordRequired');
	});

	it('exige un nouveau mot de passe', () => {
		const errors = validateBoxConfiguration(
			{...complete, password: '', confirmPassword: ''},
			'setup'
		);
		expect(errors.password).toBe('passwordRequired');
	});

	it('refuse de garder le mot de passe de l’étiquette', () => {
		const errors = validateBoxConfiguration(
			{
				...complete,
				currentPassword: 'nouveau123'
			},
			'setup'
		);
		expect(errors.password).toBe('passwordSameAsCurrent');
	});

	it('ne juge une étape que sur ses propres champs', () => {
		const errors = validateBoxConfiguration(
			{...complete, deviceName: ''},
			'setup'
		);
		expect(isBoxConfigurationValid(stepErrors(errors, 'setup', 'ownership'))).toBe(
			true
		);
		expect(stepErrors(errors, 'setup', 'account').deviceName).toBe(
			'deviceNameRequired'
		);
	});
});

describe('étapes 1 et 2 — tous les champs sont obligatoires', () => {
	const empty: BoxConfigurationForm = {
		deviceName: '',
		ssid: '',
		psk: '',
		boxIdentifier: '',
		email: '',
		currentPassword: '',
		password: '',
		confirmPassword: ''
	};
	const errors = validateBoxConfiguration(empty, 'setup');

	it('étape 1 : identifiant et mot de passe de l’étiquette', () => {
		expect(stepErrors(errors, 'setup', 'ownership')).toEqual({
			boxIdentifier: 'boxIdentifierRequired',
			currentPassword: 'currentPasswordRequired'
		});
	});

	it('étape 2 : réseau et clé Wi-Fi', () => {
		expect(stepErrors(errors, 'setup', 'wifi')).toEqual({
			ssid: 'ssidRequired',
			psk: 'pskRequired'
		});
	});
});

describe('validateBoxConfiguration — recovery', () => {
	it('se contente du Wi-Fi et du mot de passe actuel', () => {
		const errors = validateBoxConfiguration(
			{
				...complete,
				deviceName: '',
				password: '',
				confirmPassword: ''
			},
			'recovery'
		);
		expect(errors).toEqual({});
	});

	it('exige le mot de passe actuel', () => {
		const errors = validateBoxConfiguration(
			{...complete, currentPassword: ''},
			'recovery'
		);
		expect(stepErrors(errors, 'recovery', 'wifi').currentPassword).toBe(
			'currentPasswordRequired'
		);
	});
});
