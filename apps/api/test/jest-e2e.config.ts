import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  setupFiles: ['<rootDir>/setup-env.ts'],
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
      },
    ],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/../src/common/$1',
    '^@modules/(.*)$': '<rootDir>/../src/modules/$1',
    '^@jobs/(.*)$': '<rootDir>/../src/jobs/$1',
    '^@database/(.*)$': '<rootDir>/../src/database/$1',
  },
};

export default config;
