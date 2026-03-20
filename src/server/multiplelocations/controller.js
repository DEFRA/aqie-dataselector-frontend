import { english } from '~/src/server/data/en/homecontent.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import { config } from '~/src/config/config.js'
// import Wreck from '@hapi/wreck'
// import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import axios from 'axios'

// Helper function to build pollutant map for monitoring stations
function buildPollutantMap(monitoringStations) {
  const pollutantMap = new Map()

  for (const station of monitoringStations) {
    const pollutants = station.pollutants
    const pollutantKeys = Object.keys(pollutants)
    const normalizedPollutants = []

    for (const p of pollutantKeys) {
      let pollutantName
      if (p === 'PM25' || p === 'GR25') {
        pollutantName = 'PM2.5'
      } else if (p === 'MP10' || p === 'GE10' || p === 'GR10') {
        pollutantName = 'PM10'
      } else {
        pollutantName = p
      }
      normalizedPollutants.push(pollutantName)
    }

    // Remove duplicates
    const uniquePollutants = normalizedPollutants.filter(
      (item, index) => normalizedPollutants.indexOf(item) === index
    )
    pollutantMap.set(station.name, uniquePollutants)
  }

  return pollutantMap
}

async function invokeOsNameAPI(searchv) {
  const nameApiparams = {
    userLocation: searchv
  }
  try {
    const response = await axios.post(
      config.get('OS_NAMES_API_URL'),
      nameApiparams
    )

    return response.data
  } catch (error) {
    return error
  }
}

async function invokeMonitoringStationAPI(sValue, lMiles) {
  const locationvalues = {
    userLocation: sValue,
    usermiles: lMiles
  }
  try {
    const response = await axios.post(
      config.get('OS_NAMES_API_URL_1'),
      locationvalues
    )

    return response.data
  } catch (error) {
    return error
  }
}

const multipleLocationsController = {
  handler: async (request, h) => {
    // Set js_enabled to false by default
    h.state('js_enabled', 'false')
    // const logger = createLogger()
    const searchlocationurl = '/search-location'

    if (request !== null) {
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')
      const sessionQuery = request?.yar?.get('fullSearchQuery')?.value

      const payloadQuery = request.payload?.fullSearchQuery
      const milessession = request?.yar?.get('locationMiles')
      const payloadmiles = request.payload?.locationMiles

      if (
        !sessionQuery ||
        (payloadQuery != null && payloadQuery !== sessionQuery)
      ) {
        request.yar.set('selectedLocation', '')

        const hasSpecialCharacter = /[^a-zA-Z0-9 \-_.',]/.test(payloadQuery)

        request.yar.set('hasSpecialCharacter', hasSpecialCharacter)

        request.yar.set('fullSearchQuery', {
          value: request.payload.fullSearchQuery
        })

        request.yar.set('searchQuery', {
          value: request.payload.fullSearchQuery
        })
      }
      if (
        !milessession ||
        (payloadmiles != null && payloadmiles !== milessession)
      ) {
        request.yar.set('locationMiles', request.payload?.locationMiles)
      }
    }

    const searchInput = request?.yar?.get('fullSearchQuery').value
    const searchValue = request?.yar?.get('fullSearchQuery').value
    const locationMiles = request?.yar?.get('locationMiles')

    if (searchValue != null && searchValue !== '') {
      request.yar.set('searchLocation', searchValue)
      request.yar.set('searchValue', searchValue)
    } else {
      request.yar.set('searchLocation', '')
      request.yar.set('searchValue', '')
    }

    if (searchInput && !request.yar.get('hasSpecialCharacter')) {
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')
      const locationdetails = request.yar.get('osnameapiresult')

      let locations = ''
      let MonitoringstResult = ''
      let map1 = new Map()

      if (!Array.isArray(locationdetails) || locationdetails.length === 0) {
        const result = await invokeOsNameAPI(searchValue)
        // console.log('Result of OSNAMEAPI', result.getOSPlaces)
        if (result !== null) {
          request.yar.set('osnameapiresult', result)
        }

        locations = result.getOSPlaces
      } else {
        locations = locationdetails.getOSPlaces
      }

      if (searchValue != null && searchValue !== '') {
        MonitoringstResult = await invokeMonitoringStationAPI(
          searchValue,
          locationMiles
        )

        if (MonitoringstResult !== null) {
          request.yar.set('MonitoringstResult', MonitoringstResult)
        }

        // Build pollutant map if we have locations and monitoring stations
        const hasLocations = locations !== undefined && locations.length > 0
        const hasStations = MonitoringstResult?.getmonitoringstation?.length > 0

        if (hasLocations && hasStations) {
          map1 = buildPollutantMap(MonitoringstResult.getmonitoringstation)
        } else if (!hasLocations) {
          request.yar.set('errors', '')
          request.yar.set('errorMessage', '')
          request.yar.set('nooflocation', 'none')
          return h.view('multiplelocations/nolocation', {
            results: locations,
            serviceName: english.notFoundLocation.heading,
            paragraph: english.notFoundLocation.paragraphs,
            searchLocation: request.yar.get('searchLocation'),
            displayBacklink: true,
            hrefq: searchlocationurl
          })
        } else {
          // Has locations but no stations - map1 remains empty
        }
      }

      if (locations?.length === 0) {
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('nooflocation', 'none')
        return h.view('multiplelocations/nolocation', {
          results: locations,
          serviceName: english.notFoundLocation.heading,
          paragraph: english.notFoundLocation.paragraphs,
          searchLocation: request.yar.get('searchLocation'),
          displayBacklink: true,
          hrefq: searchlocationurl
        })
      } else if (locations?.length === 1) {
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('nooflocation', 'single')
        if (MonitoringstResult.getmonitoringstation.length === 0) {
          return h.view('multiplelocations/nostation', {
            locationMiles,
            serviceName: english.noStation.heading,
            paragraph: english.noStation.paragraphs,
            searchLocation: request.yar.get('searchLocation'),
            displayBacklink: true,
            hrefq: searchlocationurl
          })
        } else {
          return h.view('monitoring-station/index', {
            pageTitle: english.monitoringStation.pageTitle,
            title: english.monitoringStation.title,
            serviceName: english.monitoringStation.serviceName,
            paragraphs: english.monitoringStation.paragraphs,
            searchLocation: request.yar.get('searchLocation'),
            locationMiles,
            monitoring_station: MonitoringstResult.getmonitoringstation,
            pollmap: map1,

            displayBacklink: true,
            hrefq: searchlocationurl
          })
        }
      } else if (locations.length > 1) {
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('nooflocation', 'multiple')
        return h.view('multiplelocations/index', {
          results: locations,
          pageTitle: english.multipleLocations.pageTitle,
          heading: english.multipleLocations.heading,
          page: english.multipleLocations.page,
          serviceName: english.searchLocation.serviceName,
          title: english.multipleLocations.title,
          params: english.multipleLocations.paragraphs,
          button: english.multipleLocations.button,
          locationMiles,
          searchLocation: request.yar.get('searchLocation'),
          monitoring_station: MonitoringstResult.getmonitoringstation,
          displayBacklink: true,
          hrefq: searchlocationurl
        })
      } else {
        // Handle edge case where locations exists but has unexpected length
      }
    } else {
      const fullSearchQuery = request?.yar?.get('fullSearchQuery')
      if (request.yar.get('hasSpecialCharacter')) {
        const errorData = english.searchLocation.errorText_sp.uk
        const errorSection = errorData?.fields
        setErrorMessage(request, errorSection?.title, errorSection?.text)
        const errors = request.yar?.get('errors')
        const errorMessage = request.yar?.get('errorMessage')
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('fullSearchQuery', '')
        request.yar.set('osnameapiresult', '')
        return h.view('search-location/index', {
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

      if (!searchInput?.value) {
        const errorData = english.searchLocation.errorText.uk
        const errorSection = errorData?.fields
        setErrorMessage(request, errorSection?.title, errorSection?.text)
        const errors = request.yar?.get('errors')
        const errorMessage = request.yar?.get('errorMessage')
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('fullSearchQuery', '')
        request.yar.set('osnameapiresult', '')
        return h.view('search-location/index', {
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
    }
  }
}

export { multipleLocationsController }
