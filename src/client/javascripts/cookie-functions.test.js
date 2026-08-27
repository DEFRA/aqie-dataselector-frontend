/**
 * @jest-environment jsdom
 */

import {
  cookie,
  deleteGoogleAnalyticsCookies,
  getConsentCookie,
  isValidConsentCookie,
  setConsentCookie
} from './cookie-functions.js'

const CONSENT_COOKIE_NAME = 'cookies_policy'

function setConsentInDom(analytics, version = 1) {
  document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify({ analytics, version })}`
}

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    }
  })
}

beforeEach(() => {
  // jest-environment-jsdom does not expose structuredClone — polyfill for tests
  globalThis.structuredClone =
    globalThis.structuredClone ?? ((obj) => JSON.parse(JSON.stringify(obj)))
  globalThis.AQIE_CONSENT_COOKIE_VERSION = 1
  clearCookies()
  document.head.innerHTML = ''
  delete globalThis.dataLayer
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('getConsentCookie', () => {
  it('returns null when no consent cookie is set', () => {
    expect(getConsentCookie()).toBeNull()
  })

  it('returns the parsed preferences when the cookie is valid', () => {
    setConsentInDom(true)
    expect(getConsentCookie()).toEqual({ analytics: true, version: 1 })
  })

  it('returns null when the consent cookie contains malformed JSON', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=not-valid-json`
    expect(getConsentCookie()).toBeNull()
  })
})

describe('isValidConsentCookie', () => {
  it('returns falsy for null', () => {
    expect(isValidConsentCookie(null)).toBeFalsy()
  })

  it('returns falsy when version is below the current version', () => {
    expect(isValidConsentCookie({ analytics: true, version: 0 })).toBeFalsy()
  })

  it('returns truthy when version matches the current version', () => {
    expect(isValidConsentCookie({ analytics: true, version: 1 })).toBeTruthy()
  })
})

describe('cookie()', () => {
  it('returns null for a cookie that does not exist', () => {
    expect(cookie(CONSENT_COOKIE_NAME)).toBeNull()
  })

  it('reads back a value that was set', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=hello`
    expect(cookie(CONSENT_COOKIE_NAME)).toBe('hello')
  })

  it('deletes the consent cookie when called with null', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=toDelete`
    cookie(CONSENT_COOKIE_NAME, null)
    expect(cookie(CONSENT_COOKIE_NAME)).toBeNull()
  })
})

describe('deleteGoogleAnalyticsCookies', () => {
  it('deletes _ga cookies', () => {
    document.cookie = '_ga=GA1.1.testvalue'
    deleteGoogleAnalyticsCookies()
    expect(document.cookie).not.toContain('_ga=')
  })

  it('deletes _gid cookies', () => {
    document.cookie = '_gid=GA1.1.testvalue'
    deleteGoogleAnalyticsCookies()
    expect(document.cookie).not.toContain('_gid=')
  })

  it('deletes _ga_* stream cookies', () => {
    document.cookie = '_ga_KBRX8BS5=GS2.1.testvalue'
    deleteGoogleAnalyticsCookies()
    expect(document.cookie).not.toContain('_ga_KBRX8BS5=')
  })

  it('does not delete unrelated cookies', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify({ analytics: false, version: 1 })}`
    deleteGoogleAnalyticsCookies()
    expect(document.cookie).toContain(CONSENT_COOKIE_NAME)
  })
})

describe('setConsentCookie', () => {
  it('persists analytics: true to the consent cookie', () => {
    setConsentCookie({ analytics: true })
    const stored = getConsentCookie()
    expect(stored?.analytics).toBe(true)
    expect(stored?.version).toBe(1)
  })

  it('persists analytics: false to the consent cookie', () => {
    setConsentCookie({ analytics: false })
    const stored = getConsentCookie()
    expect(stored?.analytics).toBe(false)
  })

  it('merges with the existing consent cookie', () => {
    setConsentInDom(true)
    setConsentCookie({ analytics: false })
    expect(getConsentCookie()?.analytics).toBe(false)
  })

  it('does not include the essential key in the stored cookie', () => {
    setConsentCookie({ analytics: true, essential: true })
    expect(getConsentCookie()).not.toHaveProperty('essential')
  })

  it('deletes GA cookies when analytics is rejected', () => {
    document.cookie = '_ga=GA1.1.todelete'
    setConsentCookie({ analytics: false })
    expect(cookie('_ga')).toBeNull()
  })

  it('does not delete GA cookies when analytics is accepted', () => {
    document.cookie = '_ga=GA1.1.keepme'
    setConsentCookie({ analytics: true })
    expect(document.cookie).toContain('_ga=')
  })
})
