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
    '<rootDir>/src/server/about/',
    '<rootDir>/src/server/accessibility/',
    '<rootDir>/src/server/common/',
    '<rootDir>/src/server/data/en/content_aurn.js',
    '<rootDir>/src/client/javascripts/cookies-page.js',
    '<rootDir>/src/client/javascripts/accessible-autocomplete-p.js',
    '<rootDir>/src/config/',
    '<rootDir>/src/server/health',
    '<rootDir>/src/server/index.js',
    '<rootDir>/src/server/router.js',
    '<rootDir>/src/server/router.js',
    '<rootDir>/src/server/common/helpers/errors.js',
    '<rootDir>/src/client/javascripts/cookie-functions.js',
    '<rootDir>/src/client/javascripts/cookie-banner.js',
    '<rootDir>/src/server/common/helpers/errors_message.js',
    '<rootDir>/src/server/common/components/toggletip/toggletip.js',
    '<rootDir>/src/config/config.js',
    '<rootDir>/src/server/common/helpers/logging/logger.js',
    '<rootDir>/src/server/common/helpers/redis-client.js',
    '<rootDir>/src/server/year_aurn/controller.js',
    '<rootDir>/src/server/customdataset/controller.js',
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
