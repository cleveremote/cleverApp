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
	plugins: ['@typescript-eslint', 'react', 'react-native', 'import', 'i18next'],
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
		'react/react-in-jsx-scope': 'off',
		// Tout texte affiché passe par i18n (src/i18n).
		'i18next/no-literal-string': [
			'error',
			{
				mode: 'jsx-text-only',
				'jsx-attributes': {
					include: ['title', 'label', 'placeholder', 'message', 'subtitle', 'description', 'text', 'emptyText', 'confirmLabel', 'cancelLabel']
				}
			}
		]
	},
	overrides: [
		{
			files: ['__tests__/**', '**/*.test.*'],
			rules: {'i18next/no-literal-string': 'off'}
		}
	]
};
