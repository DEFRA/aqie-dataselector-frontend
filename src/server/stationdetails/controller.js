import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const stationDetailsController = {
  handler: async (request, h) => {
    const HTTP_BAD_REQUEST = 400
    const HTTP_NOT_FOUND = 404
    const HTTP_INTERNAL_SERVER_ERROR = 500
    const formathrs = 12
    const logger = createLogger()
    if (!request) {
      return h.response('Invalid request').code(HTTP_BAD_REQUEST)
    }
    // Clear previous session values
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

    const stationDetailsView = 'stationdetails/index'

    // Helper: Download API call
    async function invokeDownload(apiParameters) {
      try {
        const response = await axios.post(
          config.get('Download_URL'),
          apiParameters
        )
        return response.data
      } catch (error) {
        logger.error('Download API failed:', error)
        // Log the error for debugging

        return h
          .response('Failed to download data')
          .code(HTTP_INTERNAL_SERVER_ERROR)
      }
    }

    // Helper: Format date
    function parseDateFormat(apiDate) {
      const date = new Date(apiDate)
      const hours = date.getUTCHours()
      const minutes = date.getUTCMinutes()
      const ampm = hours >= formathrs ? 'pm' : 'am'
      const formattedHours = hours % formathrs || formathrs
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
      const day = date.getUTCDate()
      const month = date.toLocaleString('en-GB', { month: 'long' })
      const year = date.getUTCFullYear()
      return `${formattedHours}:${formattedMinutes} ${ampm} on ${day} ${month} ${year}`
    }
    // Get map toggletips
    function getToggletip(siteType) {
      switch (siteType) {
        case 'Urban Traffic':
          return english.stationdetails.maptoggletips.Urban_traffic
        case 'Urban Industrial':
          return english.stationdetails.maptoggletips.Urban_industrial
        case 'Suburban Industrial':
          return english.stationdetails.maptoggletips.Suburban_industrial
        case 'Suburban Background':
          return english.stationdetails.maptoggletips.Suburban_background
        case 'Rural Background':
          return english.stationdetails.maptoggletips.Rural_background
        case 'Urban Background':
          return english.stationdetails.maptoggletips.Urban_background
        default:
          return null // or undefined, or a default message
      }
    }

    // Handle download parameters
    if (request.params.download) {
      request.yar.set('selectedYear', request.params.download)
      request.yar.set('downloadPollutant', request.params.pollutant)
      request.yar.set('downloadFrequency', request.params.frequency)
    }

    // Validate request and session data

    const monitoringResult = request.yar.get('MonitoringstResult')
    if (!monitoringResult) {
      return h.response('Monitoring result not found').code(HTTP_NOT_FOUND)
    }

    const result = monitoringResult.getmonitoringstation
    if (!Array.isArray(result)) {
      return h
        .response('Invalid monitoring data format')
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }

    const station = result.find((x) => x.id === request.params.id)
    if (!station) {
      return h.response('Station not found').code(HTTP_NOT_FOUND)
    }

    request.yar.set('stationdetails', station)
    const stationDetails = request.yar.get('stationdetails')

    // Prepare date and location info
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const formattedDate = yesterday.toISOString().split('.')[0] + 'Z'
    request.yar.set('latesttime', formattedDate)
    const updatedTime = parseDateFormat(formattedDate)

    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    const today = new Date()
    const currentDate = `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'long' })}`
    const lat = stationDetails.location.coordinates[0]
    const lon = stationDetails.location.coordinates[1]
    const mapLocation = `https://www.google.co.uk/maps?q=${lat},${lon}`

    const fullSearchQuery = request?.yar?.get('fullSearchQuery')?.value
    const locationMiles = request?.yar?.get('locationMiles')
    const multipleLocID = request?.yar?.get('locationID')

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
    if (request.params.download) {
      const downloadResult = await invokeDownload(apiParams)
      request.yar.set('downloadresult', downloadResult)
    }

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
      pollutantKeys: stationDetails.pollutants,
      maptoggletips: getToggletip(stationDetails.siteType),
      selectedYear: request.yar.get('selectedYear'),
      downloadresult: request.yar.get('downloadresult'),
      hrefq:
        request.yar.get('nooflocation') === 'single'
          ? `/multiplelocations?fullSearchQuery=${fullSearchQuery}&locationMiles=${locationMiles}`
          : `/location/${multipleLocID}`
    }

    return h.view(stationDetailsView, viewData)
  }
}

export { stationDetailsController }
