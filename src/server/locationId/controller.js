import { english } from '~/src/server/data/en/homecontent.js'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()
const getLocationDetailsController = {
  handler: async (request, h) => {
    const locationID = request.params.id
    const result = request.yar.get('osnameapiresult')
    const fullSearchQuery = request.yar.get('fullSearchQuery')?.value || ''
    const locationMiles = request.yar.get('locationMiles')
    const hrefq = `/multiplelocations`

    request.yar.set('locationID', locationID)
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
      logger.error('Monitoring stations API returned null')
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

  if (config.get('isDevelopment')) {
    // localhost: use Wreck with dev API URL and key
    try {
      const url = config.get('osMonitoringStationDevUrl')
      const { payload } = await Wreck.post(url, {
        payload: JSON.stringify(locationvalues),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      return payload
    } catch (error) {
      logger.error(`Monitoring station API error (local): ${error.message}`)
      return null
    }
  } else {
    // dev / test / prod environments: use axios with config URL
    try {
      const response = await axios.post(
        config.get('OS_NAMES_API_URL_1'),
        locationvalues
      )
      return response.data
    } catch (error) {
      logger.error(`Location ID API error: ${error.message}`)
      return null
    }
  }
}

function buildPollutantMap(stations) {
  if (!Array.isArray(stations)) {
    return new Map()
  }
  const map = new Map()
  const pollutantMap = {
    PM25: 'PM2.5',
    GR25: 'PM2.5',
    MP10: 'PM10',
    GE10: 'PM10',
    GR10: 'PM10'
  }

  for (const station of stations) {
    const pollutants = Object.keys(station.pollutants).map(
      (p) => pollutantMap[p] || p
    )
    const uniquePollutants = [...new Set(pollutants)]
    map.set(station.name, uniquePollutants)
  }

  return map
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
