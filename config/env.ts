import {
	APP_MODE as RAW_APP_MODE,
	API_TARGET,
	HOTSPOT_MOCK as RAW_HOTSPOT_MOCK,
} from '@env';

// App mode, picked at Metro start: APP_ENV=demo npm start (see .env.<mode>).
// Release builds bundle with NODE_ENV=production, which loads .env.production.
export type AppMode = 'dev' | 'demo' | 'prod';

const MODES: AppMode[] = ['dev', 'demo', 'prod'];

export const APP_MODE: AppMode = MODES.includes(RAW_APP_MODE as AppMode)
	? (RAW_APP_MODE as AppMode)
	: 'dev';

export const IS_DEV = APP_MODE === 'dev';
export const IS_DEMO = APP_MODE === 'demo';
export const IS_PROD = APP_MODE === 'prod';

export const HOTSPOT_MOCK_ENABLED = RAW_HOTSPOT_MOCK === 'true';
