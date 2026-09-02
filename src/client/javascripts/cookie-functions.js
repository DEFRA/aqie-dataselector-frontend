/**
 * Cookie functions
 * ================
 *
 * Used by the cookie banner component and cookies page pattern.
 *
 * Includes function `Cookie()` for getting, setting, and deleting cookies, and
 * functions to manage the users' consent to cookies.
 *
 * Note: there is an inline script in cookie-banner.njk to show the banner
 * as soon as possible, to avoid a high Cumulative Layout Shift (CLS) score.
 * The consent cookie version is defined in cookie-banner.njk
 */

/* Name of the cookie to save users cookie preferences to. */
const CONSENT_COOKIE_NAME = 'airaqie_cookies_analytics'

/* GTM container holding our analytics tags. */
const GTM_CONTAINER_ID = 'GTM-5ZWS27T3'
const GTM_SCRIPT_URL = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`

/*
 * Prefixes of the cookies GA4 and GTM set.
 *
 * The suffix on `_ga_` is derived from the GA4 measurement ID (`G-...`), not
 * the container ID, so we match on prefix rather than listing exact names.
 */
const ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat']

/* Users can (dis)allow different groups of cookies. */
const COOKIE_CATEGORIES = {
  analytics: ANALYTICS_COOKIE_PREFIXES,
  /* Essential cookies
   *
   * Essential cookies cannot be deselected, but we want our cookie code to
   * only allow adding cookies that are documented in this object, so they need
   * to be added here.
   */
  essential: ['airaqie_cookies_analytics']
}

/*
 * Default cookie preferences if user has no cookie preferences.
 *
 * Note that this doesn't include a key for essential cookies, essential
 * cookies cannot be disallowed. If the object contains { essential: false }
 * this will be ignored.
 */
const DEFAULT_COOKIE_CONSENT = {
  analytics: false
}

/**
 * Set, get, and delete cookies.
 *
 * Setting a cookie:
 * Cookie('hobnob', 'tasty', { days: 30 })
 *
 * Reading a cookie:
 * Cookie('hobnob')
 *
 * Deleting a cookie:
 * Cookie('hobnob', null)
 * @param {string} name - Cookie name
 * @param {string | false | null} [value] - Cookie value
 * @param {{ days?: number }} [options] - Cookie options
 * @returns {string | null | undefined} - Returns value when setting or deleting
 */
export function cookie(name, value = undefined, options) {
  if (value === undefined) {
    return getCookie(name)
  }

  if (value === false || value === null) {
    deleteCookie(name)
  } else {
    const cookieOptions = options ?? { days: 30 }
    setCookie(name, value, cookieOptions)
  }
}

/**
 * Return the user's cookie preferences.
 *
 * If the consent cookie is malformed, or not present,
 * returns null.
 * @returns {ConsentPreferences | null} Consent preferences
 */
export function getConsentCookie() {
  const consentCookie = getCookie(CONSENT_COOKIE_NAME)
  let consentCookieObj

  if (consentCookie) {
    try {
      consentCookieObj = JSON.parse(consentCookie)
    } catch (error) {
      return null
    }
  } else {
    return null
  }
  return consentCookieObj
}

/**
 * Check the cookie preferences object.
 *
 * If the consent object is not present, malformed, or incorrect version,
 * returns false, otherwise returns true.
 *
 * This is also duplicated in cookie-banner.njk - the two need to be kept in sync
 * @param {ConsentPreferences | null} options - Consent preferences
 * @returns {boolean} True if consent cookie is valid
 */
export function isValidConsentCookie(options) {
  // @ts-expect-error Property does not exist on window
  return options && options.version >= globalThis.AQIE_CONSENT_COOKIE_VERSION
}

/**
 * Update the user's cookie preferences.
 * @param {ConsentPreferences} options - Consent options to parse
 */
export function setConsentCookie(options) {
  const cookieConsent =
    getConsentCookie() ||
    // If no preferences or old version use the default
    structuredClone(DEFAULT_COOKIE_CONSENT)

  // Merge current cookie preferences and new preferences
  for (const option in options) {
    cookieConsent[option] = options[option]
  }

  // Essential cookies cannot be deselected, ignore this cookie type
  delete cookieConsent.essential

  // @ts-expect-error Property does not exist on window
  cookieConsent.version = globalThis.AQIE_CONSENT_COOKIE_VERSION

  // Set the consent cookie
  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(cookieConsent), { days: 365 })

  // Update the other cookies
  resetCookies()
}

/**
 * Inject Google Tag Manager.
 *
 * Only call this once the user has consented to analytics cookies — GTM starts
 * firing tags as soon as it loads. Safe to call more than once; the container
 * is only ever injected on the first call.
 */
export function loadGoogleAnalytics() {
  if (globalThis.AQIE_GTM_LOADED) {
    return
  }
  globalThis.AQIE_GTM_LOADED = true

  globalThis.dataLayer = globalThis.dataLayer || []
  globalThis.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  })

  const script = document.createElement('script')
  script.src = GTM_SCRIPT_URL
  script.async = true
  document.head.appendChild(script)
}

/**
 * Delete every analytics cookie currently set, whatever its exact name.
 */
function deleteAnalyticsCookies() {
  for (const cookieString of document.cookie.split(';')) {
    const cookieName = cookieString.split('=')[0].trim()

    if (isAnalyticsCookie(cookieName)) {
      deleteCookie(cookieName)
    }
  }
}

/**
 * Check whether a cookie name belongs to the analytics category
 * @param {string} cookieName - Cookie name
 * @returns {boolean} True if the cookie was set by GA4 or GTM
 */
function isAnalyticsCookie(cookieName) {
  return ANALYTICS_COOKIE_PREFIXES.some(
    (prefix) => cookieName === prefix || cookieName.startsWith(`${prefix}_`)
  )
}

/**
 * Apply the user's cookie preferences
 *
 * Deletes any cookies the user has not consented to.
 */
export function resetCookies() {
  const options =
    getConsentCookie() ||
    // If no preferences or old version use the default
    structuredClone(DEFAULT_COOKIE_CONSENT)

  if (options.analytics) {
    loadGoogleAnalytics()

    // Unset UA cookies if they've been set by GTM
    removeUACookies()
  } else {
    // Consent has been refused or withdrawn, so clear up anything Google has
    // already set. GTM is never loaded in this case.
    deleteAnalyticsCookies()
  }
}

/**
 * Remove UA cookies for user and prevent Google setting them.
 *
 * We've migrated our analytics from UA (Universal Analytics) to GA4, however
 * users may still have the UA cookie set from our previous implementation.
 * Additionally, our UA properties are scheduled for deletion but until they are
 * entirely deleted, GTM is still setting UA cookies.
 *
 * Note `_ga` is deliberately not in this list: UA and GA4 share it, so deleting
 * it would reset the GA4 client ID on every page load.
 */
export function removeUACookies() {
  for (const UACookie of ['_gid', '_gat']) {
    cookie(UACookie, null)
  }
}

/**
 * Check if user allows cookie category
 * @param {string} cookieCategory - Cookie type
 * @param {ConsentPreferences} cookiePreferences - Consent preferences
 * @returns {string | boolean} Cookie type value
 */
function userAllowsCookieCategory(cookieCategory, cookiePreferences) {
  // Essential cookies are always allowed
  if (cookieCategory === 'essential') {
    return true
  }

  // Sometimes cookiePreferences is malformed in some of the tests, so we need to handle these
  try {
    return cookiePreferences[cookieCategory]
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return false
  }
}

/**
 * Check if user allows cookie
 * @param {string} cookieName - Cookie name
 * @returns {string | boolean} Cookie type value
 */
function userAllowsCookie(cookieName) {
  // Always allow setting the consent cookie
  if (cookieName === CONSENT_COOKIE_NAME) {
    return true
  }

  // Get the current cookie preferences
  let cookiePreferences = getConsentCookie()

  // If no preferences or old version use the default
  if (!isValidConsentCookie(cookiePreferences)) {
    cookiePreferences = DEFAULT_COOKIE_CONSENT
  }

  for (const category in COOKIE_CATEGORIES) {
    if (Object.hasOwn(COOKIE_CATEGORIES, category)) {
      const cookiesInCategory = COOKIE_CATEGORIES[category]

      // Analytics cookies carry a generated suffix (e.g. `_ga_G-XXXX`), so
      // match on prefix as well as exact name
      const isInCategory = cookiesInCategory.some(
        (name) => cookieName === name || cookieName.startsWith(`${name}_`)
      )

      if (isInCategory) {
        return userAllowsCookieCategory(category, cookiePreferences)
      }
    }
  }

  // Deny the cookie if it is not known to us
  return false
}

/**
 * Get cookie by name
 * @param {string} name - Cookie name
 * @returns {string | null} Cookie value
 */
function getCookie(name) {
  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')
  for (let i = 0, len = cookies.length; i < len; i++) {
    let cookieString = cookies[i]
    while (cookieString.startsWith(' ')) {
      cookieString = cookieString.substring(1, cookieString.length)
    }
    if (cookieString.startsWith(nameEQ)) {
      return decodeURIComponent(cookieString.substring(nameEQ.length))
    }
  }
  return null
}

/**
 * Set cookie by name, value and options
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {{ days?: number }} [options] - Cookie options
 */
function setCookie(name, value, options) {
  if (userAllowsCookie(name)) {
    if (options === undefined) {
      options = {}
    }
    let cookieString = `${name}=${value}; path=/`
    if (options.days) {
      const date = new Date()
      date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000)
      cookieString = `${cookieString}; expires=${date.toUTCString()}`
    }
    if (document.location.protocol === 'https:') {
      cookieString = `${cookieString}; Secure`
    }
    document.cookie = cookieString
  }
}

/**
 * Delete cookie by name
 * @param {string} name - Cookie name
 */
function deleteCookie(name) {
  if (cookie(name)) {
    // Cookies need to be deleted in the same level of specificity in which they were set
    // If a cookie was set with a specified domain, it needs to be specified when deleted
    // If a cookie wasn't set with the domain attribute, it shouldn't be there when deleted
    // You can't tell if a cookie was set with a domain attribute or not, so try both options

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${globalThis.location.hostname};path=/`
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${globalThis.location.hostname};path=/`
  }
}

/**
 * @typedef {object} ConsentPreferences
 * @property {boolean} [analytics] - Accept analytics cookies
 * @property {boolean} [essential] - Accept essential cookies
 *  @property {string} [version] - Content cookie version
 */
