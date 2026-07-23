//@ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import formatjs from 'eslint-plugin-formatjs';
import cypress from 'eslint-plugin-cypress';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        plugins: {
            react: reactPlugin,
        },
        rules: {
            ...reactPlugin.configs['jsx-runtime'].rules,
            // { rules: { 'react/jsx-runtime': 'error' } }, // React JSX runtime plugin doesn't have a preset
        },
        settings: {
            react: {
                version: 'detect', // You can add this if you get a warning about the React version when you lint
            },
        },
    },
    {
        plugins: {
            'react-hooks': hooksPlugin,
        },
        rules: hooksPlugin.configs.recommended.rules,
    },
    {
        plugins: {
            '@next/next': nextPlugin,
        },
        //@ts-expect-error somehow typescript-eslint doesn't like one rule
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            formatjs,
        },
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            quotes: ['error', 'single'],
            'object-curly-spacing': ['warn', 'always'],
            'formatjs/no-id': 'warn',
            'react-hooks/exhaustive-deps': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['**/*.spec.ts', 'cypress'],
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
        },
    },
    cypress.configs.recommended,
    // The living e2e suite must never accidentally ship a debugging-only .only/.skip
    // (which would silently disable the rest of the suite in CI) or an ignored
    // xit/xdescribe (our replacement for the old "ignoredTestFiles" folder convention -
    // tests should be tagged and grep-excluded instead, see cypress.config.ts grepTags).
    // cypress/legacy is a frozen historical snapshot and is intentionally exempt.
    {
        files: ['cypress/e2e/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        "CallExpression[callee.object.name=/^(describe|it|context)$/][callee.property.name=/^(only|skip)$/]",
                    message:
                        'Do not commit .only/.skip in cypress/e2e - use tags (see cypress.config.ts grepTags) to opt in/out of tests instead.',
                },
                {
                    selector: "Identifier[name=/^(xit|xdescribe|xcontext)$/]",
                    message:
                        'Do not commit xit/xdescribe in cypress/e2e - use tags (see cypress.config.ts grepTags) to opt in/out of tests instead.',
                },
            ],
        },
    },
);
