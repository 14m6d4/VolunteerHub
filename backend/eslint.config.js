import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Mirrors frontend/eslint.config.js, minus the React plugins and with Node globals.
export default defineConfig([
  globalIgnores(['dist', 'drizzle', 'uploads']),
  {
    files: ['**/*.{ts,js}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      // Off: ~160 hits across services, controllers and the check scripts, mostly
      // Drizzle rows and req/err objects. Typing them is a refactor of its own.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        // `const { secret, ...rest } = row` is how rows drop fields (toUser and friends).
        ignoreRestSiblings: true,
        // A leading underscore marks a parameter kept for its signature.
        argsIgnorePattern: '^_',
      }],
      // `declare global { namespace Express { ... } }` is the only way to type req.user.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
  {
    // Off here only: another PR is rewriting these two files. Drop this block once it lands.
    files: ['routes/auth.routes.ts', 'utils/validators.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
])
