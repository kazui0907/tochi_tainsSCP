import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import nodePlugin from 'eslint-plugin-n';

export default tseslint.config(
  eslint.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: ['**/node_modules/*', '**/*.mjs', '**/*.js'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },
  {
    plugins: {
      '@stylistic/ts': stylisticTs,
    },
  },
  { files: ['**/*.ts'] },
  {
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'warn',
      '@typescript-eslint/no-misused-promises': 0,
      '@typescript-eslint/no-floating-promises': 0,
      '@typescript-eslint/no-confusing-void-expression': 0,
      '@typescript-eslint/no-unnecessary-condition': 0,
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      'max-len': 0,
      '@stylistic/ts/semi': ['warn'],
      'comma-dangle': 0,
      'no-console': 0,
      'no-extra-boolean-cast': 0,
      indent: ['warn', 2],
      quotes: ['warn', 'single'],
      'n/no-process-env': 1,
      'n/no-missing-import': 0,
      'n/no-unpublished-import': 0,
      'n/no-process-exit': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      '@typescript-eslint/no-unsafe-member-access': 0,
      '@typescript-eslint/no-unsafe-argument': 0,
    },
  }
);
