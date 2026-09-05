export default {
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!<rootDir>/node_modules/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.dev\\.ts$',
    '\\.helper\\.ts$',
    '\\.helper\\.d\\.ts$',
    '/__tests__/helpers/',
    '\\.manual\\.spec\\.[jt]sx?$',
  ],
  coverageReporters: ['text', 'cobertura'],
  testResultsProcessor: 'jest-junit',
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleNameMapper: {
    /**
     * `@librechat/agents` (>=3.4.7) eagerly loads `@langchain/mistralai`, which
     * requires the ESM-only `@mistralai/mistralai` and crashes Jest's CJS runtime
     * on any suite that imports agents at all. See test/stubs/mistralai.ts.
     */
    '^@langchain/mistralai$': '<rootDir>/test/stubs/mistralai.ts',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '~/(.*)': '<rootDir>/src/$1',
  },
  // coverageThreshold: {
  //   global: {
  //     statements: 58,
  //     branches: 49,
  //     functions: 50,
  //     lines: 57,
  //   },
  // },
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  maxWorkers: '50%',
  restoreMocks: true,
  testTimeout: 15000,
};
