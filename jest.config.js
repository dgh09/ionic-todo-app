module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.model.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^ionicons/components(.*)$': '<rootDir>/__mocks__/empty.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@ionic|@angular|ionicons|rxjs|firebase|@firebase|@stencil))',
  ],
};
