import { english } from '~/src/server/data/en/homecontent.js'
import { config } from '~/src/config/config.js'
import {
  getMapReturnUrl,
  getMapViewUrlIfEnabled
} from '~/src/server/common/helpers/map-url.js'
import { last7DaysContent } from '~/src/server/data/en/last-7-days.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { buildViewGraphSummary } from '~/src/server/graph-summary/call-to-action.js'
import { buildHourlyReadings } from '~/src/server/graph-summary/hourly-readings.js'
import {
  parseDateFormat,
  getToggletip,
  invokeDownload,
  buildMapLocation,
  buildYearsArray,
  formatCurrentDate,
  fetchYearTable,
  fetchStationHistory,
  resolveStationHistory,
  getCurrentYear
} from '~/src/server/common/helpers/station-helpers.js'
import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'
import { summariseDaqiHistory } from '~/src/server/common/helpers/daqi-summary.js'
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
  const mapReturnUrl = getMapReturnUrl(request)
  if (mapReturnUrl) {
    return mapReturnUrl
  }
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
 * Resets per-request session values left over from earlier visits.
 * @param {object} request
 * @returns {void}
 */
function clearPreviousSessionValues(request) {
  request.yar.set('errors', '')
  request.yar.set('errorMessage', '')
  request.yar.set('downloadresult', '')
}

/**
 * Builds the parameters used by the download API and passed to the view.
 * @param {object} request
 * @param {object} stationDetails
 * @param {string[]} coordinates - [latitude, longitude]
 * @returns {object}
 */
function buildApiParams(request, stationDetails, [lat, lon]) {
  return {
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
}

/**
 * Stores yesterday's timestamp in the session and returns the formatted
 * "updated" time for display.
 * @param {object} request
 * @returns {string}
 */
function resolveUpdatedTime(request) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const formattedDate = yesterday.toISOString().split('.')[0] + 'Z'
  request.yar.set('latesttime', formattedDate)
  return parseDateFormat(formattedDate)
}

/**
 * Resolves the selected year from the route, persisting it to the session
 * when present.
 * @param {object} request
 * @returns {string|undefined}
 */
function resolveSelectedYear(request) {
  const routeYear = request.params?.year
  if (routeYear) {
    request.yar.set('selectedYear', routeYear)
    return routeYear
  }
  return request.yar.get('selectedYear')
}

/**
 * Only fetches what the active tab shows. The year table is fetched server
 * side so a year page's first paint has real data - without it Yearlytab
 * has to fire a follow-up /rendertable request on load, costing an extra
 * round trip and flashing an empty table. The DAQI and Last 24 hours pages
 * never show it.
 * @param {object} request
 * @param {object} stationDetails
 * @param {'year'|'daqi'|'last24hours'} activePeriod
 * @param {string|undefined} selectedYear
 * @returns {Promise<{tabledata: object|null, daqi: object, last24Hours: object}>}
 */
async function fetchTabData(
  request,
  stationDetails,
  activePeriod,
  selectedYear
) {
  if (activePeriod === 'daqi') {
    return {
      tabledata: null,
      daqi: await resolveDaqi(stationDetails),
      last24Hours: {}
    }
  }

  if (activePeriod === 'last24hours') {
    return {
      tabledata: null,
      daqi: {},
      last24Hours: await resolveStationHistory(
        stationDetails,
        HISTORY_PERIOD.LAST_24_HOURS
      )
    }
  }

  const tabledata = await fetchYearTable({
    siteId: stationDetails.localSiteID,
    year: selectedYear
  })
  request.yar.set('tabledata', tabledata)
  return { tabledata, daqi: {}, last24Hours: {} }
}

/**
 * Year and download routes always open the year tab; the Last 24 hours route
 * opens that tab; every other route opens the DAQI tab, or the year tab when
 * the DAQI tab is switched off.
 * @param {object} request
 * @param {'daqi'|'last24hours'} tabPeriod
 * @param {boolean} viewDaqiTab
 * @returns {'year'|'daqi'|'last24hours'}
 */
function resolveActivePeriod(request, tabPeriod, viewDaqiTab) {
  if (request.params?.year || request.params?.download) {
    return 'year'
  }
  if (tabPeriod === 'last24hours') {
    return tabPeriod
  }
  return viewDaqiTab ? 'daqi' : 'year'
}

/**
 * The `from` value that makes the graph page's Back link return to the tab the
 * button is on. The Daily Air Quality Index tab is the default view, so it
 * needs none.
 * @param {'year'|'daqi'|'last24hours'} activePeriod
 * @param {string|number|undefined} selectedYear
 * @returns {string|number|undefined}
 */
function graphSummaryOrigin(activePeriod, selectedYear) {
  if (activePeriod === 'last24hours') {
    return activePeriod
  }
  return activePeriod === 'year' ? selectedYear : undefined
}

/**
 * Resolves the requested station, optionally performs a download, and renders
 * the station details view, opened on the tab chosen by resolveActivePeriod.
 * @param {object} request
 * @param {object} h
 * @param {'daqi'|'last24hours'} [tabPeriod] the tab opened when the route is
 *   not a year or download route
 * @returns {Promise<object>} Hapi response
 */
async function handleStationDetails(request, h, tabPeriod = 'daqi') {
  const accessDenied = checkAccessDenied(request, h)
  if (accessDenied) {
    return accessDenied
  }

  clearPreviousSessionValues(request)

  const stationId = resolveStationId(request)
  setDownloadSessionParams(request)

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

  const updatedTime = resolveUpdatedTime(request)
  const coordinates = stationDetails.location.coordinates
  const apiParams = buildApiParams(request, stationDetails, coordinates)

  const downloadError = await performDownloadIfRequested(request, apiParams, h)
  if (downloadError) {
    return downloadError
  }

  const selectedYear = resolveSelectedYear(request)
  const viewDaqiTab = config.get('featureFlags.viewDaqiTab')
  const activePeriod = resolveActivePeriod(request, tabPeriod, viewDaqiTab)
  const { tabledata, daqi, last24Hours } = await fetchTabData(
    request,
    stationDetails,
    activePeriod,
    selectedYear
  )

  return h.view('stationdetails/index', {
    pageTitle: english.stationdetails.pageTitle,
    title: english.stationdetails.title,
    serviceName: english.stationdetails.serviceName,
    stationdetails: stationDetails,
    maplocation: buildMapLocation(...coordinates),
    updatedTime,
    displayBacklink: true,
    fullSearchQuery: request.yar.get('fullSearchQuery')?.value,
    apiparams: apiParams,
    years: buildYearsArray(),
    currentdate: formatCurrentDate(),
    currentYear: getCurrentYear(),
    pollutantKeys: stationDetails.pollutants,
    maptoggletips: getToggletip(stationDetails.siteType),
    selectedYear,
    tabledata,
    finalyear: selectedYear,
    activePeriod,
    viewDaqiTab,
    daqi,
    last24Hours,
    // Only the active tab fetches a history, so one of these is undefined.
    hourlyReadings: buildHourlyReadings(
      daqi.history ?? last24Hours.history,
      stationDetails.pollutants,
      'last24hours'
    ),
    downloadresult: request.yar.get('downloadresult'),
    hrefq: resolveStationHrefq(request),
    mapViewUrl: getMapViewUrlIfEnabled(),
    viewGraphSummary: buildViewGraphSummary({
      stationId: stationDetails.id,
      from: graphSummaryOrigin(activePeriod, selectedYear)
    })
  })
}

/**
 * Hapi route handler for /stationdetails, which opens on the Daily Air Quality
 * Index tab (or the year tab for the year and download routes).
 */
const stationDetailsController = {
  handler: (request, h) => handleStationDetails(request, h)
}

/**
 * Hapi route handler for /stationdetails/last-24-hours, the same page opened
 * on the Last 24 hours tab. This is the no-JavaScript fallback for the tab's
 * link and makes the tab linkable.
 */
const last24HoursController = {
  handler: (request, h) => handleStationDetails(request, h, 'last24hours')
}

/**
 * Hapi route handler for /stationdetails/last-7-days. Resolves the requested
 * station the same way as /stationdetails, fetches its 7-day pollutant
 * history from aqie-back-end (requires the station's AURN-form siteId - see
 * LAST_7_DAYS_FROM_AQIE_BACKEND_PLAN.md) and renders the 7-day tab.
 * @param {object} request
 * @param {object} h
 * @returns {Promise<object>} Hapi response
 */
const last7DaysController = {
  handler: async (request, h) => {
    const accessDenied = checkAccessDenied(request, h)
    if (accessDenied) {
      return accessDenied
    }

    const stationId = resolveStationId(request)
    const { response: stationError, station } = resolveStation(
      request,
      stationId,
      h
    )
    if (stationError) {
      return stationError
    }

    request.yar.set('stationdetails', station)

    const years = buildYearsArray()
    const lat = station.location.coordinates[0]
    const lon = station.location.coordinates[1]

    const last7Days = await resolveStationHistory(
      station,
      HISTORY_PERIOD.LAST_7_DAYS
    )
    const updatedTime = parseDateFormat(
      last7Days.latestReadingAt ?? new Date().toISOString()
    )

    const viewData = {
      pageTitle: last7DaysContent.pageTitle,
      serviceName: english.stationdetails.serviceName,
      stationdetails: station,
      maplocation: buildMapLocation(lat, lon),
      updatedTime,
      displayBacklink: true,
      fullSearchQuery: request.yar.get('fullSearchQuery')?.value,
      maptoggletips: getToggletip(station.siteType),
      years,
      selectedYear: request.yar.get('selectedYear'),
      activePeriod: 'last7days',
      viewDaqiTab: config.get('featureFlags.viewDaqiTab'),
      last7Days,
      hourlyReadings: buildHourlyReadings(
        last7Days.history,
        station.pollutants,
        'last7days'
      ),
      viewGraphSummary: buildViewGraphSummary({
        stationId: station.id,
        period: 'last7days',
        from: 'last7days'
      }),
      hrefq: resolveStationHrefq(request),
      mapViewUrl: getMapViewUrlIfEnabled()
    }

    return h.view('stationdetails/last-7-days', viewData)
  }
}

/**
 * Fetches and summarises the current DAQI figures for a station, or returns an
 * empty-state marker (`noMapping: true` when the station has no AURN siteId,
 * or `{}` when the upstream call fails). `history` is the raw response, for the
 * hourly readings.
 * @param {object} station
 * @returns {Promise<object>}
 */
async function resolveDaqi(station) {
  if (!station.siteId) {
    return { noMapping: true }
  }

  const history = await fetchStationHistory({
    siteId: station.siteId,
    period: '24h'
  })
  if (!history) {
    return {}
  }

  return { ...summariseDaqiHistory(history, station.pollutants), history }
}

export {
  stationDetailsController,
  last24HoursController,
  last7DaysController,
  resolveDaqi
}
