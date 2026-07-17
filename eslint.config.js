import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      // JSX parsing was never enabled in the original config, so `eslint .`
      // died with "Unexpected token <" on every component. Enable it.
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Classic rules-of-hooks. The v7 plugin's `flat.recommended` also turns on
      // the experimental React-Compiler rules (purity/immutability/
      // incompatible-library), which flag idiomatic patterns this codebase uses
      // (window.location navigation, Date.now-based expiry checks, RHF watch());
      // those aren't part of the standard Vite React lint baseline, so we stick
      // to the two stable hook rules.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // No eslint-plugin-react here to provide jsx-uses-vars, so core
      // no-unused-vars can't see that a PascalCase identifier is referenced
      // inside JSX. Ignore capitalized names (components) — the standard
      // Vite-template workaround — for both bindings and function args.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' },
      ],
    },
  },
  {
    // Build/tooling config files run in Node (module.exports, require,
    // __dirname). Give them Node globals so they don't trip no-undef.
    files: ['*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
