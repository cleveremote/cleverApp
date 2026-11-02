// Traductions embarquées dans le bundle. Le français est la langue de
// référence : ses fichiers définissent les clés (et leur typage, voir
// i18next.d.ts) ; en et ar doivent avoir exactement les mêmes clés
// (vérifié par __tests__/i18n-parity-test.ts).
import frCommon from './locales/fr/common.json';
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import frAccess from './locales/fr/access.json';
import enAccess from './locales/en/access.json';
import arAccess from './locales/ar/access.json';
import frActuators from './locales/fr/actuators.json';
import enActuators from './locales/en/actuators.json';
import arActuators from './locales/ar/actuators.json';
import frCycle from './locales/fr/cycle.json';
import enCycle from './locales/en/cycle.json';
import arCycle from './locales/ar/cycle.json';
import frDevices from './locales/fr/devices.json';
import enDevices from './locales/en/devices.json';
import arDevices from './locales/ar/devices.json';
import frFertigation from './locales/fr/fertigation.json';
import enFertigation from './locales/en/fertigation.json';
import arFertigation from './locales/ar/fertigation.json';
import frNavigation from './locales/fr/navigation.json';
import enNavigation from './locales/en/navigation.json';
import arNavigation from './locales/ar/navigation.json';
import frPlan from './locales/fr/plan.json';
import enPlan from './locales/en/plan.json';
import arPlan from './locales/ar/plan.json';
import frSensor from './locales/fr/sensor.json';
import enSensor from './locales/en/sensor.json';
import arSensor from './locales/ar/sensor.json';
import frSettings from './locales/fr/settings.json';
import enSettings from './locales/en/settings.json';
import arSettings from './locales/ar/settings.json';
import frSynoptique from './locales/fr/synoptique.json';
import enSynoptique from './locales/en/synoptique.json';
import arSynoptique from './locales/ar/synoptique.json';
import frTanks from './locales/fr/tanks.json';
import enTanks from './locales/en/tanks.json';
import arTanks from './locales/ar/tanks.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'fr';

/** Langues écrites de droite à gauche. */
export const RTL_LANGUAGES: readonly Language[] = ['ar'];

export const defaultNS = 'common';

export const resources = {
	fr: {
		common: frCommon,
		access: frAccess,
		actuators: frActuators,
		cycle: frCycle,
		devices: frDevices,
		fertigation: frFertigation,
		navigation: frNavigation,
		plan: frPlan,
		sensor: frSensor,
		settings: frSettings,
		synoptique: frSynoptique,
		tanks: frTanks
	},
	en: {
		common: enCommon,
		access: enAccess,
		actuators: enActuators,
		cycle: enCycle,
		devices: enDevices,
		fertigation: enFertigation,
		navigation: enNavigation,
		plan: enPlan,
		sensor: enSensor,
		settings: enSettings,
		synoptique: enSynoptique,
		tanks: enTanks
	},
	ar: {
		common: arCommon,
		access: arAccess,
		actuators: arActuators,
		cycle: arCycle,
		devices: arDevices,
		fertigation: arFertigation,
		navigation: arNavigation,
		plan: arPlan,
		sensor: arSensor,
		settings: arSettings,
		synoptique: arSynoptique,
		tanks: arTanks
	}
} as const;

export const namespaces = Object.keys(resources.fr) as (keyof typeof resources.fr)[];
