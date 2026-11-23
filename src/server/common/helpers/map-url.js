import { config } from '~/src/config/config.js'

/**
 * The configured aqie-maps-frontend origin without trailing slashes, or null
 * when the maps service is not configured. Trimmed with a loop rather than a
 * regex, to avoid a backtracking-prone pattern.
 * @returns {string|null}
 */
function getMapsFrontEndBaseUrl() {
  let baseUrl = config.get('mapsFrontEnd.url')
  if (!baseUrl) {
    return null
  }
  while (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  return baseUrl || null
}

/**
 * Returns the map page URL: the dataselector's own /map while
 * featureFlags.mapInDataselector is on, otherwise the aqie-maps-frontend map
 * for this environment, or null when that service is not configured.
 * @returns {string|null}
 */
function getMapUrl() {
  if (config.get('featureFlags.mapInDataselector')) {
    return '/map'
  }
  const baseUrl = getMapsFrontEndBaseUrl()
  return baseUrl ? `${baseUrl}/map` : null
}

/**
 * Same as getMapUrl, but also null while the "search on a map" feature is off.
 * @returns {string|null}
 */
function getMapUrlIfEnabled() {
  return config.get('featureFlags.searchOnMap') ? getMapUrl() : null
}

/**
 * POST target for the station page's "View map of nearby monitoring stations"
 * form, or null while the feature is off or no maps URL is configured.
 * @returns {string|null}
 */
function getMapViewUrlIfEnabled() {
  const mapUrl = getMapUrlIfEnabled()
  return mapUrl ? `${mapUrl}/view` : null
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

export {
  getMapsFrontEndBaseUrl,
  getMapUrl,
  getMapUrlIfEnabled,
  getMapViewUrlIfEnabled,
  getMapReturnUrl
}
