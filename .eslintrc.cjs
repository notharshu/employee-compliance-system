module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off'
  },
  ignorePatterns: ['dist', 'node_modules']
}
