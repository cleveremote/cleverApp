module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Loads .env.<APP_ENV> (dev | demo) and exposes it as '@env'. Without
    // APP_ENV, Release builds (NODE_ENV=production) load .env.production.
    // Values are inlined at bundle time: restart Metro with --reset-cache
    // when switching mode.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        envName: 'APP_ENV',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    // Release bundles keep only console.error/warn, so nothing a stray
    // console.log prints (tokens, payloads) ends up in device logs.
    ...(process.env.NODE_ENV === 'production'
      ? [['transform-remove-console', {exclude: ['error', 'warn']}]]
      : []),
    // Reanimated v4 moved the worklet babel plugin into react-native-worklets.
    // Must stay LAST in the plugins list.
    'react-native-worklets/plugin',
],
};
