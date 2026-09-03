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

/* Google Tag Manager containers loaded once the user accepts analytics. */
const GTM_CONTAINER_IDS = ['GTM-5ZWS27T3', 'GTM-KBRX8BS5']

/* GA4 measurement IDs configured through the containers above. */
const GA_MEASUREMENT_IDS = ['G-1Y8D0NGQWY']

/* Marks the <script> tags we inject, so we can find and remove them again. */
const GTM_SCRIPT_ATTRIBUTE = 'data-gtm-container'

/*
 * Hosts that serve analytics tags. Once the GTM loader runs it injects further
 * tags of its own (the GA4 `gtag/js` script, tracking iframes and pixels) that
 * do not carry our marker attribute, so on rejection we match by host too -
 * otherwise those tags stay in the page until the next full page load.
 */
const ANALYTICS_TAG_HOSTS = ['googletagmanager.com', 'google-analytics.com']

/*
 * GA and GTM set cookies whose full names we cannot know up front, e.g.
 * `_ga_<measurement id>`, `_gat_UA-<property id>` and `_dc_gtm_<property id>`,
 * so on rejection we match them by prefix as well as by exact name.
 */
const ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat', '_dc_gtm_']

function gtag() {
  globalThis.dataLayer.push(arguments)
}
/* Users can (dis)allow different groups of cookies. */
const COOKIE_CATEGORIES = {
  analytics: [
    '_ga',
    '_gid',
    ...GA_MEASUREMENT_IDS.map((id) => `_ga_${id.replace(/^G-/, '')}`)
  ],
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
 * Only ever called once the user has accepted analytics cookies. Safe to call
 * more than once - containers that are already on the page are skipped.
 */
export function loadGoogleAnalytics() {
  globalThis.dataLayer = globalThis.dataLayer || []

  // Clear any opt-out flags left behind by a previous rejection
  GA_MEASUREMENT_IDS.forEach((id) => {
    globalThis[`ga-disable-${id}`] = false
  })

  GTM_CONTAINER_IDS.forEach((containerId) => {
    const alreadyLoaded = document.querySelector(
      `script[${GTM_SCRIPT_ATTRIBUTE}="${containerId}"]`
    )
    if (alreadyLoaded) {
      return
    }

    globalThis.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`
    script.setAttribute(GTM_SCRIPT_ATTRIBUTE, containerId)
    document.head.appendChild(script)
  })

  gtag('js', new Date())
  GA_MEASUREMENT_IDS.forEach((id) => {
    gtag('config', id, { page_path: globalThis.location.pathname })
  })
}

/**
 * Remove Google Tag Manager and every analytics cookie it has set.
 *
 * Called when the user rejects analytics cookies, including when they change a
 * previous acceptance to a rejection on the cookies page. The tag may already
 * be executing in this page, so as well as removing every analytics tag it has
 * put in the DOM we set GA's documented opt-out flags to stop any further hits.
 */
export function removeGoogleAnalytics() {
  GA_MEASUREMENT_IDS.forEach((id) => {
    globalThis[`ga-disable-${id}`] = true
  })

  removeAnalyticsTags()

  // Drop the queue and internal state GTM reads from, so it does not pick up
  // where it left off
  delete globalThis.dataLayer
  delete globalThis.google_tag_manager
  delete globalThis.google_tag_data

  deleteAnalyticsCookies()
}

/**
 * Remove every analytics tag from the page.
 *
 * Covers the GTM loader we injected, the tags GTM went on to inject itself,
 * and the server rendered <noscript> fallback iframes - the request that
 * rendered the current page may still have carried an accepted consent cookie.
 */
function removeAnalyticsTags() {
  const selectors = [`script[${GTM_SCRIPT_ATTRIBUTE}]`]

  ANALYTICS_TAG_HOSTS.forEach((host) => {
    selectors.push(
      `script[src*="${host}"]`,
      `iframe[src*="${host}"]`,
      `img[src*="${host}"]`
    )
  })

  document
    .querySelectorAll(selectors.join(','))
    .forEach(($tag) => $tag.remove())

  /*
   * While scripting is enabled the contents of a <noscript> element are parsed
   * as text rather than as elements, so the fallback iframes inside it are not
   * matched by the selectors above. Reading innerHTML finds them either way.
   */
  document.querySelectorAll('noscript').forEach(($noscript) => {
    const holdsAnalyticsTag = ANALYTICS_TAG_HOSTS.some((host) =>
      $noscript.innerHTML.includes(host)
    )

    if (holdsAnalyticsTag) {
      $noscript.remove()
    }
  })
}

/**
 * Delete the analytics cookies set by GA/GTM.
 */
function deleteAnalyticsCookies() {
  COOKIE_CATEGORIES.analytics.forEach((cookieName) => {
    cookie(cookieName, null)
  })

  document.cookie.split(';').forEach((cookieString) => {
    const cookieName = cookieString.split('=')[0].trim()
    const isAnalyticsCookie = ANALYTICS_COOKIE_PREFIXES.some((prefix) =>
      cookieName.startsWith(prefix)
    )

    if (cookieName && isAnalyticsCookie) {
      cookie(cookieName, null)
    }
  })
}

/**
 * Apply the user's cookie preferences.
 *
 * Loads analytics only when the user has actively accepted it, and tears it
 * down - script and cookies - in every other case, including when no decision
 * has been made yet.
 */
export function resetCookies() {
  const options =
    getConsentCookie() ||
    // If no preferences or old version use the default
    structuredClone(DEFAULT_COOKIE_CONSENT)

  if (options.analytics === true) {
    loadGoogleAnalytics()
  } else {
    removeGoogleAnalytics()
  }
}

/**
 * Remove UA cookies for user and prevent Google setting them.
 *
 * We've migrated our analytics from UA (Universal Analytics) to GA4, however
 * users may still have the UA cookie set from our previous implementation.
 * Additionally, our UA properties are scheduled for deletion but until they are
 * entirely deleted, GTM is still setting UA cookies.
 */
export function removeUACookies() {
  for (const UACookie of ['_gid', '_ga']) {
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
 *  @property {string} [version] - Content cookie version
 */
