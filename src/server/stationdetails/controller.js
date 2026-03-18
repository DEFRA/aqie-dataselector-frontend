import { english } from '~/src/server/data/en/homecontent.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  parseDateFormat,
  getToggletip,
  invokeDownload,
  buildMapLocation,
  buildYearsArray,
  formatCurrentDate
} from '~/src/server/common/helpers/station-helpers.js'

const stationDetailsController = {
  handler: async (request, h) => {
    const HTTP_BAD_REQUEST = 400
    const HTTP_NOT_FOUND = 404
    const HTTP_INTERNAL_SERVER_ERROR = 500
    const logger = createLogger()
    if (!request) {
      return h.response('Invalid request').code(HTTP_BAD_REQUEST)
    }
    // Clear previous session values
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

    const stationDetailsView = 'stationdetails/index'

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

    // Generate years array dynamically from 2018 to current year
    const years = buildYearsArray()

    const currentDate = formatCurrentDate()
    const lat = stationDetails.location.coordinates[0]
    const lon = stationDetails.location.coordinates[1]
    const mapLocation = buildMapLocation(lat, lon)

    const fullSearchQuery = request?.yar?.get('fullSearchQuery')?.value
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
      const downloadResult = await invokeDownload(apiParams, logger)
      if (downloadResult instanceof Error) {
        return h
          .response('Failed to download data')
          .code(HTTP_INTERNAL_SERVER_ERROR)
      }
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
          ? `/multiplelocations`
          : `/location/${multipleLocID}`
    }

    return h.view(stationDetailsView, viewData)
  }
}

export { stationDetailsController }
