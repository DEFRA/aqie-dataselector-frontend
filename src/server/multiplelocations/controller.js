import { english } from '~/src/server/data/en/homecontent.js'
import {
  setErrorMessage,
  clearErrors
} from '~/src/server/common/helpers/errors_message.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { postJson } from '~/src/server/common/helpers/api-client.js'

const logger = createLogger()

const SEARCH_LOCATION_URL = '/search-location'

// Anything outside this set makes the search query invalid.
const DISALLOWED_SEARCH_CHARACTERS = /[^a-zA-Z0-9 \-_.',]/

// Pollutant keys the monitoring station API can use, mapped to the name the
// rest of the service displays. Anything not listed is passed through as-is.
const POLLUTANT_ALIASES = {
  PM25: 'PM2.5',
  GR25: 'PM2.5',
  MP10: 'PM10',
  GE10: 'PM10',
  GR10: 'PM10'
}

/** Maps each station name to its de-duplicated list of pollutant names. */
function buildPollutantMap(monitoringStations) {
  return new Map(
    monitoringStations.map((station) => [
      station.name,
      [
        ...new Set(
          Object.keys(station.pollutants).map(
            (key) => POLLUTANT_ALIASES[key] ?? key
          )
        )
      ]
    ])
  )
}

const invokeOsNameAPI = (userLocation) =>
  postJson({
    devUrlKey: 'osLocationDevUrl',
    urlKey: 'OS_NAMES_API_URL',
    payload: { userLocation },
    label: 'OS Names API'
  })

const invokeMonitoringStationAPI = (userLocation, usermiles) =>
  postJson({
    devUrlKey: 'osMonitoringStationDevUrl',
    urlKey: 'OS_NAMES_API_URL_1',
    payload: { userLocation, usermiles },
    label: 'Monitoring Station API'
  })

/**
 * Renders one of this journey's views. `ctx` carries the request-scoped values
 * the renderers share, and the three properties every one of these views needs
 * are filled in here so the call sites only list what differs.
 */
function renderView(ctx, template, viewData) {
  return ctx.h.view(template, {
    searchLocation: ctx.request.yar.get('searchLocation'),
    displayBacklink: true,
    hrefq: SEARCH_LOCATION_URL,
    ...viewData
  })
}

function renderNoLocationView(ctx, locations) {
  return renderView(ctx, 'multiplelocations/nolocation', {
    results: locations,
    serviceName: english.notFoundLocation.heading,
    paragraph: english.notFoundLocation.paragraphs
  })
}

function renderNoStationView(ctx) {
  return renderView(ctx, 'multiplelocations/nostation', {
    locationMiles: ctx.locationMiles,
    serviceName: english.noStation.heading,
    paragraph: english.noStation.paragraphs
  })
}

function renderMonitoringStationView(ctx, stations, pollutantMap) {
  return renderView(ctx, 'monitoring-station/index', {
    pageTitle: english.monitoringStation.pageTitle,
    title: english.monitoringStation.title,
    serviceName: english.monitoringStation.serviceName,
    paragraphs: english.monitoringStation.paragraphs,
    locationMiles: ctx.locationMiles,
    monitoring_station: stations,
    pollmap: pollutantMap
  })
}

function renderMultipleLocationsView(ctx, locations, stations) {
  return renderView(ctx, 'multiplelocations/index', {
    results: locations,
    pageTitle: english.multipleLocations.pageTitle,
    heading: english.multipleLocations.heading,
    page: english.multipleLocations.page,
    serviceName: english.searchLocation.serviceName,
    title: english.multipleLocations.title,
    params: english.multipleLocations.paragraphs,
    button: english.multipleLocations.button,
    locationMiles: ctx.locationMiles,
    monitoring_station: stations
  })
}

/** Sends the user back to the search page with an error summary. */
function renderSearchErrorView(ctx, fullSearchQuery, errorText) {
  const { request } = ctx
  const errorSection = errorText?.fields
  setErrorMessage(request, errorSection?.title, errorSection?.text)

  // Read the message setErrorMessage just stored, then clear it so it shows
  // once rather than on every later render.
  const errors = request.yar?.get('errors')
  const errorMessage = request.yar?.get('errorMessage')
  clearErrors(request)
  request.yar.set('fullSearchQuery', '')
  request.yar.set('osnameapiresult', '')

  return ctx.h.view('search-location/index', {
    pageTitle: english.searchLocation.pageTitle,
    heading: english.searchLocation.heading,
    page: english.searchLocation.page,
    serviceName: english.searchLocation.serviceName,
    params: english.searchLocation.searchParams,
    button: english.searchLocation.button,
    displayBacklink: true,
    fullSearchQuery,
    hrefq: '/',
    errors,
    errorMessage
  })
}

/** Resolves the location list from the cached session result or the OS Names API. */
async function resolveLocations(request, searchValue) {
  const cached = request.yar.get('osnameapiresult')

  // NOTE: the API returns an object, so Array.isArray is never true and this
  // cache never hits - every request calls the OS Names API. Preserved
  // deliberately; controller.test.js asserts both calls still happen.
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.getOSPlaces
  }

  const result = await invokeOsNameAPI(searchValue)
  if (result !== null) {
    request.yar.set('osnameapiresult', result)
  }
  return result.getOSPlaces
}

/** Resolves the monitoring station result, falling back to an empty result. */
async function resolveMonitoringResult(request, searchValue, locationMiles) {
  try {
    const monitoringResult = await invokeMonitoringStationAPI(
      searchValue,
      locationMiles
    )
    if (monitoringResult !== null) {
      request.yar.set('MonitoringstResult', monitoringResult)
      return monitoringResult
    }
  } catch (error) {
    logger.warn(
      `Monitoring Station API failed: ${error.message}, using empty results`
    )
  }
  return { getmonitoringstation: [] }
}

/**
 * Runs the search and picks the view for however many locations came back:
 * none, exactly one (with or without monitoring stations), or several.
 */
async function processLocationsSearch(ctx, searchValue) {
  const { request } = ctx
  const locations = await resolveLocations(request, searchValue)
  const monitoringResult = await resolveMonitoringResult(
    request,
    searchValue,
    ctx.locationMiles
  )
  const stations = monitoringResult?.getmonitoringstation ?? []

  clearErrors(request)

  if (!locations?.length) {
    request.yar.set('nooflocation', 'none')
    return renderNoLocationView(ctx, locations)
  }

  if (locations.length === 1) {
    request.yar.set('nooflocation', 'single')
    return stations.length === 0
      ? renderNoStationView(ctx)
      : renderMonitoringStationView(ctx, stations, buildPollutantMap(stations))
  }

  request.yar.set('nooflocation', 'multiple')
  return renderMultipleLocationsView(ctx, locations, stations)
}

/** Stores the query and radius from the payload when either has changed. */
function syncSearchSession(request) {
  const sessionQuery = request?.yar?.get('fullSearchQuery')?.value
  const payloadQuery = request.payload?.fullSearchQuery
  const sessionMiles = request?.yar?.get('locationMiles')
  const payloadMiles = request.payload?.locationMiles

  if (
    !sessionQuery ||
    (payloadQuery != null && payloadQuery !== sessionQuery)
  ) {
    request.yar.set('selectedLocation', '')
    request.yar.set(
      'hasSpecialCharacter',
      DISALLOWED_SEARCH_CHARACTERS.test(payloadQuery)
    )
    request.yar.set('fullSearchQuery', { value: payloadQuery })
    request.yar.set('searchQuery', { value: payloadQuery })
  }

  if (
    !sessionMiles ||
    (payloadMiles != null && payloadMiles !== sessionMiles)
  ) {
    request.yar.set('locationMiles', payloadMiles)
  }
}

const multipleLocationsController = {
  handler: async (request, h) => {
    try {
      h.state('js_enabled', 'false')
      clearErrors(request)
      syncSearchSession(request)

      const searchValue = request?.yar?.get('fullSearchQuery').value
      const ctx = {
        h,
        request,
        locationMiles: request?.yar?.get('locationMiles')
      }

      request.yar.set('searchLocation', searchValue || '')
      request.yar.set('searchValue', searchValue || '')

      if (searchValue && !request.yar.get('hasSpecialCharacter')) {
        clearErrors(request)
        return await processLocationsSearch(ctx, searchValue)
      }

      // Either the query was empty or it contained characters we reject.
      const errorText = request.yar.get('hasSpecialCharacter')
        ? english.searchLocation.errorText_sp.uk
        : english.searchLocation.errorText.uk

      return renderSearchErrorView(
        ctx,
        request?.yar?.get('fullSearchQuery'),
        errorText
      )
    } catch (error) {
      logger.error(`Handler error: ${error.message}`)
      return h.redirect('/problem-with-service')
    }
  }
}

export { multipleLocationsController }
