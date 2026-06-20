const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'dist-check/**', 'node_modules/**'],
  },
];
