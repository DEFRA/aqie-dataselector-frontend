import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

async function Invoketable(params) {
  // Renamed parameter to avoid shadowing
  try {
    const response = await axios.post(config.get('Table_URL'), params)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}

const stationDetailsNojsController = {
  handler: async (request, h) => {
    if (!request.yar.get('SiteId')) {
      request.yar.set('SiteId', request.params.id)
    }

    const formathrs = 12
    const logger = createLogger()
    if (!request) {
      return h.response('Invalid request')
    }
    // Clear previous session values
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

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

        return error
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

    const result = monitoringResult.getmonitoringstation

    const station = result.find((x) => x.id === request.yar.get('SiteId'))
    // if (!station) {
    //  catchAll(request, h)
    // }

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
    const multipleLocID = request?.yar?.get('locationID')

    // Render Table
    if (request.url.pathname.includes('/stationDetailsNojs/')) {
      const currentYear = String(new Date().getFullYear())
      if (!request.params.year) {
        request.yar.set('selectedYear', currentYear)
      } else {
        request.yar.set('selectedYear', request.params.year)
      }
    } else {
      request.yar.set('selectedYear', request.params.year)
    }

    const apiparamsTable = {
      siteId: request.yar.get('stationdetails').localSiteID,
      year: request.yar.get('selectedYear')
    }

    const tabledata = await Invoketable(apiparamsTable)

    // const finalyear = request.yar.get('selectedYear')

    if (
      !tabledata || // null or undefined
      (Array.isArray(tabledata) && tabledata.length === 0) || // empty array
      (typeof tabledata === 'object' &&
        !Array.isArray(tabledata) &&
        Object.keys(tabledata).length === 0) // empty object
    ) {
      request.yar.set('tabledata', null)
    } else {
      request.yar.set('tabledata', tabledata)
    }

    // Handle download request //commented for now
    if (request.url.pathname.includes('/stationDetailsNojs/download')) {
      const apiparamsDownload = {
        region: stationDetails.region,
        siteType: stationDetails.siteType,
        sitename: stationDetails.name,
        siteId: stationDetails.localSiteID,
        latitude: stationDetails.location.coordinates[0].toString(),
        longitude: stationDetails.location.coordinates[1].toString(),
        year: request.yar.get('selectedYear'),
        downloadpollutant: request.params.poll,
        downloadpollutanttype: request.params.freq,
        stationreaddate: request.yar.get('latesttime')
      }

      //  const currentYear = String(new Date().getFullYear());
      const downloadResult = await invokeDownload(apiparamsDownload)
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

      years,
      currentdate: currentDate,
      pollutantKeys: stationDetails.pollutants,
      maptoggletips: getToggletip(stationDetails.siteType),
      selectedYear: request.yar.get('selectedYear'),
      // downloadresult: request.yar.get('downloadresult'),
      tabledata: request.yar.get('tabledata'),
      hrefq:
        request.yar.get('nooflocation') === 'single'
          ? `/multiplelocations`
          : `/location/${multipleLocID}`
    }
    request.yar.set('viewData', viewData)

    return h.view('stationDetailsNojs/index', viewData)
  }
}

export { stationDetailsNojsController }
