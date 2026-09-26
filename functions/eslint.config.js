const parser = require('@typescript-eslint/parser');

module.exports = [
  { ignores: ['lib/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser, ecmaVersion: 2020, sourceType: 'module' },
    rules: {
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
    },
  },
];
