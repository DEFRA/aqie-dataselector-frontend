/**
 * @type {Config}
 */
export default {
  rootDir: '.',
  verbose: true,
  resetModules: true,
  clearMocks: true,
  silent: false,
  testMatch: ['**/src/**/*.test.js'],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  setupFiles: ['<rootDir>/.jest/setup-file.js'],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup-file-after-env.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    '<rootDir>/.public',
    '<rootDir>/src/server/common/test-helpers',
    '<rootDir>/src/client/javascripts/application.js',
    '<rootDir>/src/index.js',
    '<rootDir>/src/server/locationId/controller.js',
    '<rootDir>/src/server/monitoring-station/controller.js',
    '<rootDir>/src/server/multiplelocations/controller.js',
    '<rootDir>/src/server/privacy/controller.js',
    '<rootDir>/src/server/search-location/controller.js',
    '<rootDir>/src/server/stationdetails/controller.js',
    '<rootDir>/src/server/home/controller.js',
    '<rootDir>/src/server/cookies/controller.js',
    '<rootDir>/src/server/accessibility/controller.js',
    '<rootDir>/src/server/common/helpers/errors.js',
    '<rootDir>/src/server/common/helpers/errors_message.js',
    '<rootDir>/src/server/common/helpers/errors_message.js',
    'index.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    `node_modules/(?!${[
      '@defra/hapi-tracing', // Supports ESM only
      'node-fetch' // Supports ESM only
    ].join('|')}/)`
  ]
}

/**
 * @import { Config } from 'jest'
 */
