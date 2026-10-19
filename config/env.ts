import {
	APP_MODE as RAW_APP_MODE,
	API_TARGET,
	HOTSPOT_MOCK as RAW_HOTSPOT_MOCK,
} from '@env';

// App mode, picked at Metro start: APP_ENV=demo npm start (see .env.<mode>).
export type AppMode = 'dev' | 'demo' | 'expert';

const MODES: AppMode[] = ['dev', 'demo', 'expert'];

export const APP_MODE: AppMode = MODES.includes(RAW_APP_MODE as AppMode)
	? (RAW_APP_MODE as AppMode)
	: 'dev';

export const IS_DEV = APP_MODE === 'dev';
export const IS_DEMO = APP_MODE === 'demo';
// Unlocks advanced UI (expert settings/screens).
export const IS_EXPERT = APP_MODE === 'expert';

export const USE_LOCAL_API = API_TARGET === 'local';
export const HOTSPOT_MOCK_ENABLED = RAW_HOTSPOT_MOCK === 'true';
