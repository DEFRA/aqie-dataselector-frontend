import { english } from '~/src/server/data/en/homecontent.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  parseDateFormat,
  getToggletip,
  invokeDownload,
  buildMapLocation,
  buildYearsArray,
  formatCurrentDate,
  fetchYearTable,
  getCurrentYear
} from '~/src/server/common/helpers/station-helpers.js'
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

const logger = createLogger()

/**
 * Resolves the station id from the POST payload or the session, persisting
 * it to the session when it arrives via payload.
 * @param {object} request
 * @returns {string}
 */
function resolveStationId(request) {
  if (request.method === 'post' && request.payload?.stationId) {
    const stationId = request.payload.stationId
    request.yar.set('SiteId', stationId)
    return stationId
  }
  return request.yar.get('SiteId')
}

/**
 * Returns the backlink href, based on whether the session has one or many
 * matching locations.
 * @param {object} request
 * @returns {string}
 */
function resolveStationHrefq(request) {
  return request.yar.get('nooflocation') === 'single'
    ? `/multiplelocations`
    : `/location`
}

/**
 * Guards against direct/untrusted navigation to this route. A redirect (e.g.
 * from /station-summary) keeps the original external referer, so
 * deepLinkTrusted stands in for the referer check here - consumed
 * immediately so it can't be replayed.
 * @param {object} request
 * @param {object} h
 * @returns {object|null} Hapi response if access should be denied, otherwise null.
 */
function checkAccessDenied(request, h) {
  if (!request) {
    return h.response('Invalid request').code(HTTP_BAD_REQUEST)
  }

  const isTrustedDeepLink = request.yar.get('deepLinkTrusted')
  if (isTrustedDeepLink) {
    request.yar.set('deepLinkTrusted', false)
  }

  // If accessed directly (no valid referer), return 404 page not found
  if (!isTrustedDeepLink && !isInternalNavigation(request)) {
    return renderNotFound(h)
  }

  return null
}

/**
 * Stores the requested download year, pollutant and frequency in the
 * session, when a download is being requested.
 * @param {object} request
 * @returns {void}
 */
function setDownloadSessionParams(request) {
  if (!request.params.download) {
    return
  }
  request.yar.set('selectedYear', request.params.download)
  request.yar.set('downloadPollutant', request.params.pollutant)
  request.yar.set('downloadFrequency', request.params.frequency)
}

/**
 * Validates session data and locates the requested station, returning either
 * an error response or the resolved station.
 * @param {object} request
 * @param {string} stationId
 * @param {object} h
 * @returns {{response?: object, station?: object}}
 */
function resolveStation(request, stationId, h) {
  const monitoringResult = request.yar.get('MonitoringstResult')
  if (!monitoringResult) {
    return {
      response: h.response('Monitoring result not found').code(HTTP_NOT_FOUND)
    }
  }

  const result = monitoringResult.getmonitoringstation
  if (!Array.isArray(result)) {
    return {
      response: h
        .response('Invalid monitoring data format')
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }
  }

  const station = result.find((x) => x.id === stationId)
  if (!station) {
    return { response: h.response('Station not found').code(HTTP_NOT_FOUND) }
  }

  return { station }
}

/**
 * Invokes the download API when a download is being requested, storing the
 * result in the session.
 * @param {object} request
 * @param {object} apiParams
 * @param {object} h
 * @returns {Promise<object|null>} Hapi response on failure, otherwise null.
 */
async function performDownloadIfRequested(request, apiParams, h) {
  if (!request.params.download) {
    return null
  }
  const downloadResult = await invokeDownload(apiParams, logger)
  if (downloadResult instanceof Error) {
    return h
      .response('Failed to download data')
      .code(HTTP_INTERNAL_SERVER_ERROR)
  }
  request.yar.set('downloadresult', downloadResult)
  return null
}

/**
 * Hapi route handler for /stationdetails. Resolves the requested station,
 * optionally performs a download, and renders the station details view.
 * @param {object} request
 * @param {object} h
 * @returns {Promise<object>} Hapi response
 */
const stationDetailsController = {
  handler: async (request, h) => {
    const accessDenied = checkAccessDenied(request, h)
    if (accessDenied) {
      return accessDenied
    }

    // Clear previous session values
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

    const stationDetailsView = 'stationdetails/index'

    // Get station ID from POST payload or session
    const stationId = resolveStationId(request)

    setDownloadSessionParams(request)

    // Validate request and session data
    const { response: stationError, station } = resolveStation(
      request,
      stationId,
      h
    )
    if (stationError) {
      return stationError
    }

    request.yar.set('stationdetails', station)
    const stationDetails = request.yar.get('stationdetails')

    // Prepare date and location info
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const formattedDate = yesterday.toISOString().split('.')[0] + 'Z'
    request.yar.set('latesttime', formattedDate)
    const updatedTime = parseDateFormat(formattedDate)

    // Generate years array dynamically from 2018 to current year
    const years = buildYearsArray()

    const currentDate = formatCurrentDate()
    const lat = stationDetails.location.coordinates[0]
    const lon = stationDetails.location.coordinates[1]
    const mapLocation = buildMapLocation(lat, lon)

    const fullSearchQuery = request.yar.get('fullSearchQuery')?.value

    // Prepare API parameters
    const apiParams = {
      region: stationDetails.region,
      siteType: stationDetails.siteType,
      sitename: stationDetails.name,
      siteId: stationDetails.localSiteID,
      latitude: lat.toString(),
      longitude: lon.toString(),
      year: request.yar.get('selectedYear'),
      downloadpollutant: request.yar.get('downloadPollutant'),
      downloadpollutanttype: request.yar.get('downloadFrequency'),
      stationreaddate: stationDetails.updated
    }

    // Handle download request
    const downloadError = await performDownloadIfRequested(
      request,
      apiParams,
      h
    )
    if (downloadError) {
      return downloadError
    }

    // Fetch the year table server side so the first paint shows real data.
    // Without this Yearlytab has to fire a follow-up /rendertable request on
    // load, costing an extra round trip and flashing an empty table.
    const selectedYear = request.yar.get('selectedYear')
    const tabledata = await fetchYearTable({
      siteId: stationDetails.localSiteID,
      year: selectedYear
    })
    request.yar.set('tabledata', tabledata)

    // Prepare view data
    const viewData = {
      pageTitle: english.stationdetails.pageTitle,
      title: english.stationdetails.title,
      serviceName: english.stationdetails.serviceName,
      stationdetails: stationDetails,
      maplocation: mapLocation,
      updatedTime,
      displayBacklink: true,
      fullSearchQuery,
      apiparams: apiParams,
      years,
      currentdate: currentDate,
      currentYear: getCurrentYear(),
      pollutantKeys: stationDetails.pollutants,
      maptoggletips: getToggletip(stationDetails.siteType),
      selectedYear,
      tabledata,
      finalyear: selectedYear,
      downloadresult: request.yar.get('downloadresult'),
      hrefq: resolveStationHrefq(request)
    }

    return h.view(stationDetailsView, viewData)
  }
}

export { stationDetailsController }
