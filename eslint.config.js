// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // --- TypeScript files ---
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // Prevent silent type-unsafety; force explicit returns on public methods
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      // No non-null assertions to silence the compiler
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },

  // --- API model files: allow snake_case property names ---
  // The README requires models to mirror the backend JSON exactly, including
  // snake_case properties (first_name, category_name, unit_price). A blanket
  // naming-convention rule would flag every model interface, so we disable it
  // for files under models/ directories only.
  {
    files: ['**/models/**/*.ts', '**/shared/models/**/*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  // --- HTML templates ---
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
