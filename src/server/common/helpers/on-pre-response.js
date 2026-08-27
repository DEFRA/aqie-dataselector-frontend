const CONSENT_COOKIE_NAME = 'cookies_policy'
const CONSENT_COOKIE_VERSION = 1
// Matches all GA and GTM cookie names: _ga, _ga_*, _gid, _gat_*, _dc_gtm_*
const GA_COOKIE_REGEX = /^_ga$|^_ga_.*$|^_gid$|^_gat_.*$|^_dc_gtm_.*$/

/**
 * Expires GA cookies server-side when the user has not consented.
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
function removeGaCookiesIfRejected(request, h) {
  try {
    const raw = request.state?.[CONSENT_COOKIE_NAME]
    if (!raw) return

    const policy = JSON.parse(raw)
    if (policy?.analytics === true || policy?.version < CONSENT_COOKIE_VERSION) return

    for (const cookieName of Object.keys(request.state)) {
      if (GA_COOKIE_REGEX.test(cookieName)) {
        h.unstate(cookieName)
      }
    }
  } catch {
    // malformed consent cookie — skip
  }
}

/**
 * Hapi onPreResponse handler that applies security headers and expires GA cookies
 * server-side when a user has not consented — covers no-JS users where
 * client-side deletion never runs.
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
function onPreResponse(request, h) {
  const { response } = request
  if (response.isBoom) {
    return h.continue
  }

  removeGaCookiesIfRejected(request, h)

  response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.header(
    'Content-Security-Policy',
    "style-src 'self'; img-src 'self'; frame-ancestors 'none'"
  )
  response.header('Cache-Control', 'no-store')
  return h.continue
}

export { onPreResponse }
