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
const CONSENT_COOKIE_NAME = 'cookies_policy'

/* Users can (dis)allow different groups of cookies. */
const COOKIE_CATEGORIES = {
  analytics: ['_ga', '_gid'],
  /* Essential cookies
   *
   * Essential cookies cannot be deselected, but we want our cookie code to
   * only allow adding cookies that are documented in this object, so they need
   * to be added here.
   */
  essential: ['cookies_policy']
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
function cookie(name, value = undefined, options = undefined) {
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
 * Update the user's cookie preferences.
 * @param {ConsentPreferences} options - Consent options to parse
 */
function setConsentCookie(options) {
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
 * Apply the user's cookie preferences
 *
 * Deletes any cookies the user has not consented to.
 */
function resetCookies() {
  const options =
    getConsentCookie() ||
    // If no preferences or old version use the default
    structuredClone(DEFAULT_COOKIE_CONSENT)

  for (const cookieType in options) {
    if (cookieType === 'version' || cookieType === 'essential') {
      continue
    }
    if (!options[cookieType] && cookieType === 'analytics') {
      deleteGoogleAnalyticsCookies()
    }
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

      if (cookiesInCategory.includes(cookieName)) {
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
 *  @property {number} [version] - Content cookie version
 */

export {
  cookie,
  deleteGoogleAnalyticsCookies,
  getConsentCookie,
  isValidConsentCookie,
  resetCookies,
  setConsentCookie
}
