module.exports = {
	root: true,
	extends: [
		'@react-native',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-native/all',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'react', 'react-native', 'import'],
	env: {
		'react-native/react-native': true,
		es6: true,
		node: true
	},
	ignorePatterns: ['node_modules/', 'android/', 'ios/', 'build/', 'dist/'],
	rules: {
		'react-native/no-inline-styles': 'off',
		'react-native/no-raw-text': 'off',
		'react-native/sort-styles': 'off', // 🔥 désactive la règle buguée
		'@typescript-eslint/no-unused-vars': ['warn'],
		'react/react-in-jsx-scope': 'off'
	}
};
