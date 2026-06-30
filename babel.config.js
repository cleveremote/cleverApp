module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated v4 moved the worklet babel plugin into react-native-worklets.
    // Must stay LAST in the plugins list.
    'react-native-worklets/plugin',
],
};
