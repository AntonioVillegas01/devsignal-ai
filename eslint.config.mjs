import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'node:*',
            'next',
            'next/*',
            '@google/*',
            '**/infrastructure/**',
            '**/container/**',
            '**/config/**',
            'fs',
            'path',
            'child_process',
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    '.cache/**',
    'coverage/**',
  ]),
]);
