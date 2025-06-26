/**
 * @jest-environment jsdom
 */

import CookieBanner from '~/src/client/javascripts/cookie-banner.js'
import * as CookieFunctions from './cookie-functions.js'

jest.mock('./cookie-functions.js', () => ({
  getConsentCookie: jest.fn(),
  setConsentCookie: jest.fn(),
  resetCookies: jest.fn()
}))

describe('CookieBanner', () => {
  let $module

  beforeEach(() => {
    document.body.classList.add('govuk-frontend-supported')
    window.location.pathname = '/'

    document.body.innerHTML = `
      <div class="cookie-banner">
        <button class="js-cookie-banner-accept">Accept</button>
        <button class="js-cookie-banner-reject">Reject</button>
        <div class="js-cookie-banner-message"></div>
        <div class="js-cookie-banner-confirmation-accept" hidden></div>
        <div class="js-cookie-banner-confirmation-reject" hidden></div>
        <button class="js-cookie-banner-hide"></button>
      </div>
    `

    $module = document.querySelector('.cookie-banner')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('should not initialize if not on supported page or on /cookies/', () => {
    document.body.classList.remove('govuk-frontend-supported')
    const banner = new CookieBanner($module)
    expect(banner).toBeInstanceOf(CookieBanner)
    expect(banner.$cookieBanner).toBeUndefined()
  })

  it('should show banner and reset cookies if no consent cookie', () => {
    CookieFunctions.getConsentCookie.mockReturnValue(null)

    const banner = new CookieBanner($module)

    expect(CookieFunctions.resetCookies).toHaveBeenCalled()
    expect(banner.$cookieBanner.hasAttribute('hidden')).toBe(false)
  })

  it('should call setConsentCookie(true) on accept', () => {
    CookieFunctions.getConsentCookie.mockReturnValue(null)
    const banner = new CookieBanner($module)

    banner.$acceptButton.click()

    expect(CookieFunctions.setConsentCookie).toHaveBeenCalledWith({
      analytics: true
    })
    expect(banner.$cookieMessage.hasAttribute('hidden')).toBe(true)
    expect(banner.$cookieConfirmationAccept.hasAttribute('hidden')).toBe(false)
  })

  it('should call setConsentCookie(false) on reject', () => {
    CookieFunctions.getConsentCookie.mockReturnValue(null)
    const banner = new CookieBanner($module)

    banner.$rejectButton.click()

    expect(CookieFunctions.setConsentCookie).toHaveBeenCalledWith({
      analytics: false
    })
    expect(banner.$cookieMessage.hasAttribute('hidden')).toBe(true)
    expect(banner.$cookieConfirmationReject.hasAttribute('hidden')).toBe(false)
  })

  it('should hide banner when hide button is clicked', () => {
    CookieFunctions.getConsentCookie.mockReturnValue(null)
    const banner = new CookieBanner($module)

    const hideButton = $module.querySelector('.js-cookie-banner-hide')
    hideButton.click()

    expect(banner.$cookieBanner.getAttribute('hidden')).toBe('true')
  })
})
