import { NativeModules, Platform } from 'react-native';

const { SSLCAModule } = NativeModules;

let initialized = false;

/**
 * Initializes SSL trust with the custom CA certificate.
 * Must be called once before any secure connection.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initSSL(): Promise<void> {
  if (initialized) return;

  if (!SSLCAModule) {
    throw new Error(
      `SSLCAModule is not available on ${Platform.OS}. ` +
        'Ensure the native module is properly linked.',
    );
  }

  await SSLCAModule.initialize();
  initialized = true;
}
