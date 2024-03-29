module.exports = {
    root: true,
    extends: ['prettier'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
        }
    ]
};
