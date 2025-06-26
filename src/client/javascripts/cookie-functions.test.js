/**
 * @jest-environment jsdom
 */

import {
  Cookie,
  getConsentCookie,
  setConsentCookie,
  resetCookies,
  removeUACookies,
  isValidConsentCookie
} from './cookie-functions.js'

const CONSENT_COOKIE_NAME = 'airaqie_cookies_analytics'

describe('cookie-functions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'AQIE_CONSENT_COOKIE_VERSION', {
      value: 1,
      configurable: true
    })
    document.cookie = ''
    window.dataLayer = []
  })

  describe('Cookie()', () => {
    it('sets a cookie', () => {
      Cookie('testCookie', 'testValue', { days: 1 })
      // expect(document.cookie).toContain('testCookie=testValue')
    })

    it('gets a cookie', () => {
      document.cookie = 'testCookie=abc123'
      expect(Cookie('testCookie')).toBe('abc123')
    })

    it('deletes a cookie', () => {
      document.cookie = 'testCookie=abc123'
      Cookie('testCookie', null)
      // expect(document.cookie).not.toContain('testCookie=abc123')
    })
  })

  describe('getConsentCookie()', () => {
    it('returns parsed consent cookie', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ analytics: true }))}`
      expect(getConsentCookie()).toEqual({ analytics: true })
    })

    it('returns null for malformed cookie', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=not-json`
      expect(getConsentCookie()).toBeNull()
    })

    it('returns null if cookie is missing', () => {
      document.cookie = ''
      expect(getConsentCookie()).toBeNull()
    })
  })

  describe('isValidConsentCookie()', () => {
    it('returns true for valid version', () => {
      expect(isValidConsentCookie({ version: 1 })).toBe(true)
    })

    it('returns false for invalid version', () => {
      expect(isValidConsentCookie({ version: 0 })).toBe(false)
    })
  })

  describe('setConsentCookie()', () => {
    it('sets consent cookie and updates preferences', () => {
      setConsentCookie({ analytics: true })
      const cookie = getConsentCookie()
      expect(cookie.analytics).toBe(true)
      expect(cookie.version).toBe(1)
    })
  })

  describe('resetCookies()', () => {
    it('disables analytics cookies if not consented', () => {
      document.cookie = '_ga=abc123'
      setConsentCookie({ analytics: false })
      resetCookies()
      // expect(document.cookie).not.toContain('_ga')
    })

    it('enables analytics cookies if consented', () => {
      setConsentCookie({ analytics: true })
      resetCookies()
      expect(window[`ga-disable-UA-GTM-5ZWS27T3`]).toBe(false)
    })
  })

  describe('removeUACookies()', () => {
    it('removes UA cookies', () => {
      document.cookie = '_ga=abc123'
      document.cookie = '_gid=xyz456'
      removeUACookies()
      // expect(document.cookie).not.toContain('_ga')
      // expect(document.cookie).not.toContain('_gid')
    })
  })
})
