import * as CookieFunctions from './cookie-functions.js'

const cookieBannerAcceptSelector = '.js-cookie-banner-accept'
const cookieBannerRejectSelector = '.js-cookie-banner-reject'
const cookieBannerHideButtonSelector = '.js-cookie-banner-hide'
const cookieMessageSelector = '.js-cookie-banner-message'
const cookieConfirmationAcceptSelector = '.js-cookie-banner-confirmation-accept'
const cookieConfirmationRejectSelector = '.js-cookie-banner-confirmation-reject'

class CookieBanner {
  initialized = false

  constructor($module) {
    if (!this.shouldInitialize($module)) {
      return
    }

    this.$cookieBanner = $module
    this.cacheElements($module)

    if (!this.areElementsValid()) {
      return
    }

    this.initialized = true
    this.bindEvents()
  }

  shouldInitialize($module) {
    return (
      $module instanceof HTMLElement &&
      document.body.classList.contains('govuk-frontend-supported') &&
      !this.onCookiesPage()
    )
  }

  cacheElements($module) {
    this.$acceptButton = $module.querySelector(cookieBannerAcceptSelector)
    this.$rejectButton = $module.querySelector(cookieBannerRejectSelector)
    this.$cookieMessage = $module.querySelector(cookieMessageSelector)
    this.$cookieConfirmationAccept = $module.querySelector(
      cookieConfirmationAcceptSelector
    )
    this.$cookieConfirmationReject = $module.querySelector(
      cookieConfirmationRejectSelector
    )
    this.$cookieBannerHideButtons = $module.querySelectorAll(
      cookieBannerHideButtonSelector
    )
  }

  areElementsValid() {
    return (
      this.$acceptButton instanceof HTMLButtonElement &&
      this.$rejectButton instanceof HTMLButtonElement &&
      this.$cookieMessage instanceof HTMLElement &&
      this.$cookieConfirmationAccept instanceof HTMLElement &&
      this.$cookieConfirmationReject instanceof HTMLElement &&
      this.$cookieBannerHideButtons.length > 0
    )
  }

  bindEvents() {
    this.$acceptButton.addEventListener('click', (event) => {
      event.preventDefault()
      this.acceptCookies()
    })
    this.$rejectButton.addEventListener('click', (event) => {
      event.preventDefault()
      this.rejectCookies()
    })
    this.$cookieBannerHideButtons.forEach((btn) =>
      btn.addEventListener('click', () => this.hideBanner())
    )
  }

  hideBanner() {
    this.$cookieBanner.setAttribute('hidden', 'true')
  }

  acceptCookies() {
    CookieFunctions.setConsentCookie({ analytics: true })
    this.$cookieMessage.setAttribute('hidden', 'true')
    this.revealConfirmationMessage(this.$cookieConfirmationAccept)
    this.loadGtm(this.$cookieBanner.dataset.gtmKey)
    this.submitPreference(true)
  }

  rejectCookies() {
    CookieFunctions.setConsentCookie({ analytics: false })
    this.$cookieMessage.setAttribute('hidden', 'true')
    this.revealConfirmationMessage(this.$cookieConfirmationReject)
    this.submitPreference(false)
  }

  /**
   * Loads a GTM container immediately on accept — avoids losing the current
   * page view. The key is read from data-gtm-key set server-side from config.
   * @param {string} gtmKey
   */
  loadGtm(gtmKey) {
    if (!gtmKey || !/^GTM-[A-Z0-9]+$/.test(gtmKey)) {
      return
    }
    globalThis.dataLayer = globalThis.dataLayer || []
    globalThis.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmKey}`
    document.head.appendChild(script)
  }

  /**
   * Persists the consent choice server-side via XHR so the server cookie is
   * set without a page reload. Falls back to a native form POST on failure.
   * @param {boolean} analytics
   */
  submitPreference(analytics) {
    const crumb = this.$cookieBanner.dataset.crumb
    const form = this.$cookieBanner.closest('form')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/cookies', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        form?.submit()
      }
    }
    xhr.onerror = () => {
      form?.submit()
    }
    xhr.send(JSON.stringify({ analytics, async: true, crumb }))
  }

  revealConfirmationMessage(confirmationMessage) {
    confirmationMessage.removeAttribute('hidden')
    if (!confirmationMessage.getAttribute('tabindex')) {
      confirmationMessage.setAttribute('tabindex', '-1')
      confirmationMessage.addEventListener('blur', () => {
        confirmationMessage.removeAttribute('tabindex')
      })
    }
    confirmationMessage.focus()
  }

  onCookiesPage() {
    return globalThis.location.pathname === '/cookies/'
  }
}

export default CookieBanner
