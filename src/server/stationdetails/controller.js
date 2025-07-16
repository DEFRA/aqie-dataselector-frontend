import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

const stationDetailsController = {
  handler: async (request, h) => {
    if (!request) {
      return h.response('Invalid request').code(400)
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
        return h.response('Failed to download data').code(500)
      }
    }

    // Helper: Format date
    function parseDateFormat(apiDate) {
      const date = new Date(apiDate)
      const hours = date.getUTCHours()
      const minutes = date.getUTCMinutes()
      const ampm = hours >= 12 ? 'pm' : 'am'
      const formattedHours = hours % 12 || 12
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
      const day = date.getUTCDate()
      const month = date.toLocaleString('en-GB', { month: 'long' })
      const year = date.getUTCFullYear()
      return `${formattedHours}:${formattedMinutes} ${ampm} on ${day} ${month} ${year}`
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
      return h.response('Monitoring result not found').code(404)
    }

    const result = monitoringResult.getmonitoringstation
    if (!Array.isArray(result)) {
      return h.response('Invalid monitoring data format').code(500)
    }

    const station = result.find((x) => x.id === request.params.id)
    if (!station) {
      return h.response('Station not found').code(404)
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
