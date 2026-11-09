import {HOTSPOT_MOCK_ENABLED} from './env';

export const WEBSITE_URL = 'https://api.cleversystech.com';

// Simulate joining the box hotspot instead of driving the Wi-Fi stack, so the
// QR pairing screen can be exercised without a box (and on a simulator).
export const HOTSPOT_MOCK = HOTSPOT_MOCK_ENABLED;
