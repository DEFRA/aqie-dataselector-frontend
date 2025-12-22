import { english } from '~/src/server/data/en/homecontent.js'
import { config } from '~/src/config/config.js'
// import Wreck from '@hapi/wreck'
import axios from 'axios'
const getLocationDetailsController = {
  handler: async (request, h) => {
    // const logger = createLogger()
    const locationID = request.params.id
    const result = request.yar.get('osnameapiresult')
    const fullSearchQuery = request.yar.get('fullSearchQuery')?.value || ''
    const locationMiles = request.yar.get('locationMiles')
    const hrefq = `/multiplelocations`

    request.yar.set('locationID', locationID)
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')

    if (!result || !locationID) {
      return
    }

    const userLocation = findUserLocation(result.getOSPlaces, locationID)
    if (!userLocation) {
      return
    }

    const monitoringResult = await fetchMonitoringStations(
      userLocation,
      locationMiles
    )
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
  try {
    const response = await axios.post(
      config.get('OS_NAMES_API_URL_1'),
      locationvalues
    )

    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
  // dev
  // try {
  //             const url = 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-monitoringstation-backend/monitoringstation'
  //             const { res, payload } = await Wreck.post(url, {
  //               payload: JSON.stringify(locationvalues),
  //                headers: {
  //           'x-api-key': '7y46uRQC244tKKawWFY1Xs7rVnDThE5i'
  //         },
  //               json: true
  //             })
  //     console.log("PAYLOAD",payload)
  //             return payload
  //           } catch (error) {
  //             return error // Rethrow the error so it can be handled appropriately
  //           }
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
