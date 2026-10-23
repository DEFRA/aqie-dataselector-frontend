import fetchMock from 'jest-fetch-mock'
import crypto from 'node:crypto'

// Provide a test-only session cookie secret so config.js validation doesn't
// fail the test suite. Generated randomly at runtime so no secret is ever
// hardcoded/committed to source control.
process.env.SESSION_COOKIE_PASSWORD ??= crypto.randomBytes(32).toString('hex')

global.fetch = fetchMock
