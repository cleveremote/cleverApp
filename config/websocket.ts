import {HOTSPOT_MOCK_ENABLED, USE_LOCAL_API} from './env';

// Driven by APP_ENV (see config/env.ts and .env.<mode>).
export const DEV_MODE = USE_LOCAL_API;
export const WEBSITE_URL = 'https://api.cleversystech.com';
export const WEBSITE_URL_LOCAL = 'https://pi-dev-1.local';

// Simulate joining the box hotspot instead of driving the Wi-Fi stack, so the
// QR pairing screen can be exercised without a box (and on a simulator).
export const HOTSPOT_MOCK = HOTSPOT_MOCK_ENABLED;
