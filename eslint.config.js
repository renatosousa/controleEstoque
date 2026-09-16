const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'data/**']
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js', 'bin/www'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        Intl: 'readonly',
        document: 'readonly',
        window: 'readonly',
        FormData: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
