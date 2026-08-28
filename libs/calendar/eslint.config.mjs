import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'lib',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'lib',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
  {
    // `declare namespace google.accounts.oauth2` augments the real global
    // namespace Google's own gsi/client script attaches to `window` at
    // runtime, there's no ES module form of a global augmentation like
    // this. `allowDefinitionFiles` (the rule's own default exemption)
    // doesn't cover this file: it has to be a real `.ts` module (not
    // `.d.ts`), otherwise ng-packagr's declaration bundler can't resolve
    // it when building the `@zhunam/calendar/google` entry point,
    // confirmed by hitting that exact failure with a `.d.ts` version of
    // this same file.
    files: ['**/google-identity-services.ts'],
    rules: {
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
];
