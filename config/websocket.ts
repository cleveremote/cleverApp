import {API_URL, HOTSPOT_MOCK_ENABLED} from './env';

export const WEBSITE_URL = API_URL;

// Simulate joining the box hotspot instead of driving the Wi-Fi stack, so the
// QR pairing screen can be exercised without a box (and on a simulator).
export const HOTSPOT_MOCK = HOTSPOT_MOCK_ENABLED;
