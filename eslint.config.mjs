import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import playwright from 'eslint-plugin-playwright'
import eslintConfigPrettier from 'eslint-config-prettier'

const isCI = process.env.CI === 'true'

const config = [
    {
        ignores: ['node_modules', 'dist', 'playwright-report', 'test-results'],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            playwright,
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',

            'playwright/missing-playwright-await': 'warn',
            'playwright/no-page-pause': 'warn',
            'playwright/no-useless-await': 'warn',
            'playwright/no-skipped-test': isCI ? 'error' : 'warn',
            'playwright/expect-expect': 'warn',
        },
    },
    eslintConfigPrettier,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            semi: ['error', 'never'],
        },
    },
]

export default config
