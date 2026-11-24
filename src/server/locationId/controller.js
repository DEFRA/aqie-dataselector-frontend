import { english } from '~/src/server/data/en/homecontent.js'
import { postJson } from '~/src/server/common/helpers/api-client.js'
import { buildPollutantMap } from '~/src/server/common/helpers/monitoring-station-pollutants.js'
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

const getLocationDetailsController = {
  handler: async (request, h) => {
    // If accessed directly (no valid referer), return 404 page not found
    if (!isInternalNavigation(request)) {
      return renderNotFound(h)
    }

    const locationID = resolveLocationID(request)

    const result = request.yar.get('osnameapiresult')
    const fullSearchQuery = request.yar.get('fullSearchQuery')?.value || ''
    const locationMiles = request.yar.get('locationMiles')
    const hrefq = `/multiplelocations`

    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')

    if (!result || !locationID) {
      return h.response('Invalid request').code(HTTP_BAD_REQUEST)
    }

    const userLocation = findUserLocation(result.getOSPlaces, locationID)
    if (!userLocation) {
      return h.response('Location not found').code(HTTP_NOT_FOUND)
    }

    const monitoringResult = await fetchMonitoringStations(
      userLocation,
      locationMiles
    )

    if (monitoringResult === null) {
      return h
        .response('Error retrieving monitoring stations')
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }

    request.yar.set('MonitoringstResult', monitoringResult)

    const pollMap = buildPollutantMap(monitoringResult.getmonitoringstation)

    if (monitoringResult.getmonitoringstation.length === 0) {
      return renderNoStation(h, userLocation, locationMiles, hrefq)
    }

    return renderMonitoringStation(
      h,
      userLocation,
      locationMiles,
      monitoringResult,
      pollMap,
      fullSearchQuery,
      hrefq
    )
  }
}

// 🔍 Helper Functions

// For POST request, get locationID from form payload and store in session.
// For GET request, retrieve locationID from session.
function resolveLocationID(request) {
  let locationID

  if (request.method === 'post' && request.payload?.locationId) {
    locationID = request.payload.locationId
    request.yar.set('locationID', locationID)
  } else if (request.method === 'get' && request.params?.id === undefined) {
    locationID = request.yar.get('locationID')
  } else {
    locationID = request.params?.id
    request.yar.set('locationID', locationID)
  }
  return locationID

  // return request.params.id
  // return request.yar.get('fullSearchQuery')?.value
  // return request.yar.get('locationID')
}

function findUserLocation(locations, locationID) {
  if (!locations) {
    return ''
  }
  for (const loc of locations) {
    if (loc.GAZETTEER_ENTRY.ID === locationID) {
      return loc.GAZETTEER_ENTRY.NAME1
    }
  }
  return ''
}

async function fetchMonitoringStations(location, miles) {
  const locationvalues = {
    userLocation: location,
    usermiles: miles
  }

  try {
    return await postJson({
      devUrlKey: 'osMonitoringStationDevUrl',
      urlKey: 'OS_NAMES_API_URL_1',
      payload: locationvalues,
      label: 'Monitoring Station API'
    })
  } catch {
    return null
  }
}

function renderMonitoringStation(
  h,
  location,
  miles,
  result,
  pollMap,
  query,
  hrefq
) {
  return h.view('monitoring-station/index', {
    pageTitle: english.monitoringStation.pageTitle,
    title: english.monitoringStation.title,
    serviceName: english.monitoringStation.serviceName,
    paragraphs: english.monitoringStation.paragraphs,
    searchLocation: location,
    locationMiles: miles,
    monitoring_station: result.getmonitoringstation,
    pollmap: pollMap,
    displayBacklink: true,
    fullSearchQuery: query,
    hrefq
  })
}

function renderNoStation(h, location, miles, hrefq) {
  return h.view('multiplelocations/nostation', {
    locationMiles: miles,
    serviceName: english.noStation.heading,
    paragraph: english.noStation.paragraphs,
    searchLocation: location,
    displayBacklink: true,
    hrefq
  })
}

export { getLocationDetailsController, findUserLocation, buildPollutantMap }
