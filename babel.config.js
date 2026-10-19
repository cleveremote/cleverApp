module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Loads .env.<APP_ENV> (dev | demo | expert) and exposes it as '@env'.
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
    // Reanimated v4 moved the worklet babel plugin into react-native-worklets.
    // Must stay LAST in the plugins list.
    'react-native-worklets/plugin',
],
};
