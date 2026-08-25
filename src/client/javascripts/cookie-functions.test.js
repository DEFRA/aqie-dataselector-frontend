/**
 * @jest-environment jsdom
 */

import {
  cookie,
  getConsentCookie,
  isValidConsentCookie,
  removeUACookies,
  resetCookies,
  setConsentCookie
} from './cookie-functions.js'

const CONSENT_COOKIE_NAME = 'cookies_policy'
const TRACKING_ID = 'GTM-5ZWS27T3'

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
  delete globalThis[`ga-disable-UA-${TRACKING_ID}`]
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

describe('removeUACookies', () => {
  it('deletes _ga and _gid', () => {
    document.cookie = '_ga=GA1.1.testvalue'
    document.cookie = '_gid=GA1.1.testvalue2'

    removeUACookies()

    expect(document.cookie).not.toContain('_ga=')
    expect(document.cookie).not.toContain('_gid=')
  })
})

describe('resetCookies', () => {
  describe('when analytics consent is true', () => {
    beforeEach(() => {
      setConsentInDom(true)
    })

    it('sets the GA disable flag to false', () => {
      resetCookies()
      expect(globalThis[`ga-disable-UA-${TRACKING_ID}`]).toBe(false)
    })

    it('appends the GA loader script to document.head', () => {
      resetCookies()
      expect(
        document.head.querySelector('script[src*="googletagmanager"]')
      ).not.toBeNull()
    })

    it('does not delete analytics cookies', () => {
      document.cookie = '_ga=GA1.1.keepme'
      resetCookies()
      expect(document.cookie).toContain('_ga=')
    })
  })

  describe('when analytics consent is false', () => {
    beforeEach(() => {
      setConsentInDom(false)
    })

    it('sets the GA disable flag to true', () => {
      resetCookies()
      expect(globalThis[`ga-disable-UA-${TRACKING_ID}`]).toBe(true)
    })

    it('does not append a GA script', () => {
      resetCookies()
      expect(
        document.head.querySelector('script[src*="googletagmanager"]')
      ).toBeNull()
    })

    it('deletes existing analytics cookies', () => {
      document.cookie = '_ga=GA1.1.todelete'
      resetCookies()
      expect(cookie('_ga')).toBeNull()
    })
  })

  describe('when no consent cookie exists', () => {
    it('defaults to analytics: false and disables GA', () => {
      resetCookies()
      expect(globalThis[`ga-disable-UA-${TRACKING_ID}`]).toBe(true)
    })

    it('does not append a GA script', () => {
      resetCookies()
      expect(
        document.head.querySelector('script[src*="googletagmanager"]')
      ).toBeNull()
    })
  })
})

describe('setConsentCookie', () => {
  it('persists analytics: true to the consent cookie', () => {
    setConsentCookie({ analytics: true })
    const stored = getConsentCookie()
    expect(stored.analytics).toBe(true)
    expect(stored.version).toBe(1)
  })

  it('persists analytics: false to the consent cookie', () => {
    setConsentCookie({ analytics: false })
    const stored = getConsentCookie()
    expect(stored.analytics).toBe(false)
  })

  it('merges with the existing consent cookie', () => {
    setConsentInDom(true)
    setConsentCookie({ analytics: false })
    expect(getConsentCookie().analytics).toBe(false)
  })

  it('does not include the essential key in the stored cookie', () => {
    setConsentCookie({ analytics: true, essential: true })
    expect(getConsentCookie()).not.toHaveProperty('essential')
  })
})
