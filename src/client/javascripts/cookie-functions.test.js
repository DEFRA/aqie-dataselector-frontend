/*
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://service.dev.cdp-int.defra.cloud/"}
 *
 * A multi label host, as in the deployed environments: analytics cookies there
 * are scoped to a parent domain, which `localhost` cannot reproduce.
 */

import {
  loadGoogleAnalytics,
  removeGoogleAnalytics,
  resetCookies,
  setConsentCookie
} from '~/src/client/javascripts/cookie-functions.js'

const CONSENT_COOKIE_NAME = 'airaqie_cookies_analytics'
const MEASUREMENT_ID = 'G-1Y8D0NGQWY'

/** Mimics the GA4 tag GTM injects for itself once the loader has run. */
function addTagInjectedByGtm() {
  const $script = document.createElement('script')
  $script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}&l=dataLayer&cx=c`
  document.head.appendChild($script)
  return $script
}

/** Mimics the <noscript> fallback rendered by page.njk. */
function addNoscriptFallback() {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZWS27T3" height="0" width="0"></iframe></noscript>'
  )
}

describe('cookie-functions', () => {
  beforeAll(() => {
    // This jsdom version predates structuredClone, which browsers all support
    globalThis.structuredClone ??= (value) => JSON.parse(JSON.stringify(value))
  })

  beforeEach(() => {
    globalThis.AQIE_CONSENT_COOKIE_VERSION = 1
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.cookie.split(';').forEach((cookieString) => {
      const name = cookieString.split('=')[0].trim()
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      }
    })

    delete globalThis.dataLayer
    delete globalThis[`ga-disable-${MEASUREMENT_ID}`]
  })

  describe('loadGoogleAnalytics', () => {
    it('injects each GTM container once and clears any opt-out flag', () => {
      globalThis[`ga-disable-${MEASUREMENT_ID}`] = true

      loadGoogleAnalytics()
      loadGoogleAnalytics()

      const $scripts = document.querySelectorAll('script[data-gtm-container]')
      expect(
        Array.from($scripts).map(($script) =>
          $script.getAttribute('data-gtm-container')
        )
      ).toEqual(['GTM-5ZWS27T3', 'GTM-KBRX8BS5'])
      expect(globalThis[`ga-disable-${MEASUREMENT_ID}`]).toBe(false)
    })
  })

  describe('removeGoogleAnalytics', () => {
    it('removes the GTM loader scripts it injected', () => {
      loadGoogleAnalytics()

      removeGoogleAnalytics()

      expect(
        document.querySelectorAll('script[data-gtm-container]')
      ).toHaveLength(0)
    })

    it('removes analytics tags GTM injected itself', () => {
      loadGoogleAnalytics()
      addTagInjectedByGtm()

      removeGoogleAnalytics()

      expect(
        document.querySelectorAll('script[src*="googletagmanager.com"]')
      ).toHaveLength(0)
    })

    it('removes the noscript fallback rendered for the accepted consent', () => {
      addNoscriptFallback()

      removeGoogleAnalytics()

      expect(document.querySelectorAll('noscript')).toHaveLength(0)
    })

    it('leaves unrelated noscript content alone', () => {
      document.body.innerHTML = '<noscript><p>Enable JavaScript</p></noscript>'

      removeGoogleAnalytics()

      expect(document.querySelectorAll('noscript')).toHaveLength(1)
    })

    it('sets the GA opt-out flag and drops the GTM globals', () => {
      loadGoogleAnalytics()
      globalThis.google_tag_manager = {}
      globalThis.google_tag_data = {}

      removeGoogleAnalytics()

      expect(globalThis[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
      expect(globalThis.dataLayer).toBeUndefined()
      expect(globalThis.google_tag_manager).toBeUndefined()
      expect(globalThis.google_tag_data).toBeUndefined()
    })

    it('deletes analytics cookies, including ones matched by prefix', () => {
      document.cookie = '_ga=GA1.1.123.456;path=/'
      document.cookie = `_ga_${MEASUREMENT_ID.replace('G-', '')}=GS1.1.789;path=/`
      document.cookie = '_dc_gtm_UA-12345=1;path=/'
      document.cookie = 'session=keep-me;path=/'

      removeGoogleAnalytics()

      expect(document.cookie).not.toContain('_ga')
      expect(document.cookie).not.toContain('_dc_gtm_')
      expect(document.cookie).toContain('session=keep-me')
    })

    it('deletes analytics cookies scoped to a parent domain', () => {
      // How GA actually scopes its cookies in a deployed environment - the
      // page host is service.dev.cdp-int.defra.cloud
      document.cookie = '_ga=GA1.1.123.456;domain=.defra.cloud;path=/'
      document.cookie = `_ga_${MEASUREMENT_ID.replace('G-', '')}=GS1.1.789;domain=.cdp-int.defra.cloud;path=/`
      expect(document.cookie).toContain('_ga')

      removeGoogleAnalytics()

      expect(document.cookie).not.toContain('_ga')
    })
  })

  describe('resetCookies', () => {
    it('tears analytics down when the preference is not accepted', () => {
      loadGoogleAnalytics()
      addTagInjectedByGtm()
      addNoscriptFallback()

      resetCookies()

      expect(
        document.querySelectorAll('script[src*="googletagmanager.com"]')
      ).toHaveLength(0)
      expect(document.querySelectorAll('noscript')).toHaveLength(0)
      expect(globalThis[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
    })

    it('loads analytics when the preference is accepted', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify({ analytics: true, version: 1 })};path=/`

      resetCookies()

      expect(
        document.querySelectorAll('script[data-gtm-container]').length
      ).toBeGreaterThan(0)
    })
  })

  describe('setConsentCookie', () => {
    it('removes an already injected tag when analytics is rejected', () => {
      setConsentCookie({ analytics: true })
      addTagInjectedByGtm()
      expect(
        document.querySelectorAll('script[src*="googletagmanager.com"]').length
      ).toBeGreaterThan(0)

      setConsentCookie({ analytics: false })

      expect(
        document.querySelectorAll('script[src*="googletagmanager.com"]')
      ).toHaveLength(0)
      expect(globalThis[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
    })
  })
})
