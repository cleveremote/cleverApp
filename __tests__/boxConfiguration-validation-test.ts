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

	it('accepte un nouveau mot de passe égal à l’actuel', () => {
		const errors = validateBoxConfiguration(
			{
				...complete,
				currentPassword: 'nouveau123'
			},
			'setup'
		);
		expect(errors.password).toBeUndefined();
	});

	it('n’exige aucun nouveau mot de passe quand l’actuel est gardé', () => {
		const errors = validateBoxConfiguration(
			{...complete, password: '', confirmPassword: ''},
			'setup',
			{keepCurrentPassword: true}
		);
		expect(errors).toEqual({});
	});

	it('ne juge une étape que sur ses propres champs', () => {
		const errors = validateBoxConfiguration(
			{...complete, deviceName: ''},
			'setup'
		);
		expect(isBoxConfigurationValid(stepErrors(errors, 'wifi'))).toBe(true);
		expect(stepErrors(errors, 'account').deviceName).toBe(
			'deviceNameRequired'
		);
	});
});

describe('étapes', () => {
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

	it('étape 1 : identifiant, réseau et clé Wi-Fi', () => {
		expect(stepErrors(errors, 'wifi')).toEqual({
			boxIdentifier: 'boxIdentifierRequired',
			ssid: 'ssidRequired',
			psk: 'pskRequired'
		});
	});

	it("étape 2 : mot de passe de l'étiquette", () => {
		expect(stepErrors(errors, 'ownership')).toEqual({
			currentPassword: 'currentPasswordRequired'
		});
	});

	it('étape 3 : nom et nouveau mot de passe', () => {
		expect(stepErrors(errors, 'account')).toEqual({
			deviceName: 'deviceNameRequired',
			password: 'passwordRequired',
			confirmPassword: 'confirmRequired'
		});
	});
});

describe('validateBoxConfiguration — recovery', () => {
	it('se contente du Wi-Fi', () => {
		const errors = validateBoxConfiguration(
			{
				...complete,
				deviceName: '',
				currentPassword: '',
				password: '',
				confirmPassword: ''
			},
			'recovery'
		);
		expect(errors).toEqual({});
	});
});

describe('validateBoxConfiguration — clé Wi-Fi', () => {
	it('est exigée pour un réseau inconnu de la box', () => {
		const errors = validateBoxConfiguration({...complete, psk: ''}, 'setup');
		expect(errors.psk).toBe('pskRequired');
	});

	it("est facultative pour un réseau qu'elle connaît déjà", () => {
		const errors = validateBoxConfiguration({...complete, psk: ''}, 'setup', {
			pskOptional: true
		});
		expect(errors.psk).toBeUndefined();
	});
});
