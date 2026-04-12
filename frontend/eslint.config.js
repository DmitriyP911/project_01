import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
      prettier: prettierPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // Отключаем no-undef для TS-файлов — TypeScript сам проверяет неопределённые переменные
      'no-undef': 'off',

      // Двойные кавычки везде
      'quotes': 'off',
      '@typescript-eslint/quotes': ['error', 'double', { avoidEscape: true }],

      // TypeScript
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // React
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',

      // Import order
      'import/order': [
        'error',
        {
          groups: [
            'builtin',        // node built-ins
            'external',       // сторонние библиотеки (react, axios, ...)
            'internal',       // внутренние алиасы (@/...)
            ['parent', 'sibling', 'index'], // относительные импорты компонентов
            'object',
            'type',
            'unknown',
          ],
          pathGroups: [
            {
              // стили — всегда последними (покрывает .css, .module.css, .scss, .sass)
              pattern: '**/*.{css,scss,sass}',
              group: 'unknown',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          warnOnUnassignedImports: true,
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
  prettierConfig,
];
