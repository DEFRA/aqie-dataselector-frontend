import { config } from '~/src/config/config.js'

/**
 * Returns the map page URL for this environment, or null when the maps
 * service is not configured.
 * @returns {string|null}
 */
function getMapUrl() {
  const baseUrl = config.get('mapsFrontEnd.url')
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}/map` : null
}

/**
 * Same as getMapUrl, but also null while the "search on a map" feature is off.
 * @returns {string|null}
 */
function getMapUrlIfEnabled() {
  return config.get('featureFlags.searchOnMap') ? getMapUrl() : null
}

/**
 * Map URL to use as a station page's Back link, only while the user is still
 * on the station they opened from the map (set by /station-summary).
 * @param {object} request
 * @returns {string|null}
 */
function getMapReturnUrl(request) {
  const returnSiteId = request.yar.get('mapReturnSiteId')
  if (returnSiteId && returnSiteId === request.yar.get('SiteId')) {
    return getMapUrl()
  }
  return null
}

export { getMapUrl, getMapUrlIfEnabled, getMapReturnUrl }
