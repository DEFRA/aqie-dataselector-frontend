/**
 * Cookie functions used by the cookie banner and cookies page.
 * The consent cookie version set here must match the one in cookie-banner.njk.
 */

const CONSENT_COOKIE_NAME = 'cookies_policy'

const COOKIE_CATEGORIES = {
  analytics: ['_ga', '_gid'],
  // essential cookies are listed so userAllowsCookie() can identify them, not to gate deletion
  essential: ['cookies_policy']
}

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
function cookie(name, value = undefined, options = undefined) {
  if (value === undefined) {
    return getCookie(name)
  }

  if (value === false || value === null) {
    return deleteCookie(name)
  } else {
    const cookieOptions = options ?? { days: 30 }
    return setCookie(name, value, cookieOptions)
  }
}

/**
 * Return the user's cookie preferences.
 *
 * If the consent cookie is malformed, or not present,
 * returns null.
 * @returns {ConsentPreferences | null} Consent preferences
 */
function getConsentCookie() {
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
function isValidConsentCookie(options) {
  // @ts-expect-error Property does not exist on window
  return options && options.version >= globalThis.AQIE_CONSENT_COOKIE_VERSION
}

/**
 * Saves the user's consent preferences, strips non-saveable fields, and
 * deletes GA cookies immediately if analytics has been rejected.
 * @param {ConsentPreferences} options
 */
function setConsentCookie(options) {
  const cookieConsent =
    getConsentCookie() || structuredClone(DEFAULT_COOKIE_CONSENT)

  for (const option in options) {
    cookieConsent[option] = options[option]
  }

  delete cookieConsent.essential
  // @ts-expect-error Property does not exist on window
  cookieConsent.version = globalThis.AQIE_CONSENT_COOKIE_VERSION

  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(cookieConsent), { days: 365 })

  if (!cookieConsent.analytics) {
    deleteGoogleAnalyticsCookies()
  }
}

/**
 * Builds the set of domains to attempt cookie deletion against.
 * Includes the exact hostname, .hostname, and all parent domains.
 * @param {string} hostname
 * @returns {Set<string>}
 */
function buildDeletableDomains(hostname) {
  const domains = new Set()
  domains.add(hostname)
  domains.add('.' + hostname)
  const parts = hostname.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    domains.add('.' + parts.slice(i).join('.'))
  }
  return domains
}

/**
 * Deletes all GA and GTM cookies across all domain variants.
 * Covers _ga, _ga_* (GA4 stream), _gid, _gat_*, _dc_gtm_* patterns.
 */
function deleteGoogleAnalyticsCookies() {
  const prefixes = ['_ga', '_gid', '_gat', '_dc_gtm_']
  const domains = buildDeletableDomains(globalThis.location.hostname)
  for (const cookieStr of document.cookie.split(';')) {
    const name = cookieStr.split('=')[0].trim()
    if (prefixes.some((prefix) => name.startsWith(prefix))) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      for (const domain of domains) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=/`
      }
    }
  }
}

/**
 * Returns true if the named cookie category is permitted.
 * Always returns true for essential cookies.
 * @param {string} cookieCategory
 * @param {ConsentPreferences} cookiePreferences
 * @returns {string | boolean}
 */
function userAllowsCookieCategory(cookieCategory, cookiePreferences) {
  if (cookieCategory === 'essential') {
    return true
  }

  try {
    return cookiePreferences[cookieCategory]
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return false
  }
}

/**
 * Returns true if the named cookie is permitted to be set or read.
 * The consent cookie itself is always allowed.
 * @param {string} cookieName
 * @returns {string | boolean}
 */
function userAllowsCookie(cookieName) {
  if (cookieName === CONSENT_COOKIE_NAME) {
    return true
  }

  let cookiePreferences = getConsentCookie()

  if (!isValidConsentCookie(cookiePreferences)) {
    cookiePreferences = DEFAULT_COOKIE_CONSENT
  }

  for (const category in COOKIE_CATEGORIES) {
    if (Object.hasOwn(COOKIE_CATEGORIES, category)) {
      const cookiesInCategory = COOKIE_CATEGORIES[category]

      if (cookiesInCategory.includes(cookieName)) {
        return userAllowsCookieCategory(category, cookiePreferences)
      }
    }
  }

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
 * Deletes a cookie across three domain variants (no domain, exact, and .domain)
 * because the original Set-Cookie domain attribute is not readable by JS.
 * @param {string} name
 */
function deleteCookie(name) {
  if (cookie(name)) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${globalThis.location.hostname};path=/`
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${globalThis.location.hostname};path=/`
  }
}

/**
 * @typedef {object} ConsentPreferences
 * @property {boolean} [analytics] - Accept analytics cookies
 * @property {boolean} [essential] - Accept essential cookies
 *  @property {number} [version] - Content cookie version
 */

export {
  cookie,
  deleteGoogleAnalyticsCookies,
  getConsentCookie,
  isValidConsentCookie,
  setConsentCookie
}
