import { english } from '~/src/server/data/en/homecontent.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  parseDateFormat,
  getToggletip,
  invokeDownload,
  invokeTable,
  buildMapLocation,
  buildYearsArray,
  formatCurrentDate
} from '~/src/server/common/helpers/station-helpers.js'

function handleDownloadParams(request) {
  if (request.params.download) {
    request.yar.set('selectedYear', request.params.download)
    request.yar.set('downloadPollutant', request.params.pollutant)
    request.yar.set('downloadFrequency', request.params.frequency)
  }
}

function setSelectedYearForNoJs(request) {
  const pathIncludesNoJs = request.url.pathname.includes('/stationDetailsNojs/')
  if (!pathIncludesNoJs) {
    request.yar.set('selectedYear', request.params.year)
    return
  }

  const currentYear = String(new Date().getFullYear())
  const selectedYear = request.params.year || currentYear
  request.yar.set('selectedYear', selectedYear)
}

function isEmptyTableData(tabledata) {
  return (
    !tabledata ||
    (Array.isArray(tabledata) && tabledata.length === 0) ||
    (typeof tabledata === 'object' &&
      !Array.isArray(tabledata) &&
      Object.keys(tabledata).length === 0)
  )
}

async function maybeHandleDownloadRequest(
  request,
  stationDetails,
  selectedYear,
  logger
) {
  if (!request.url.pathname.includes('/stationDetailsNojs/download')) {
    return
  }

  const apiparamsDownload = {
    region: stationDetails.region,
    siteType: stationDetails.siteType,
    sitename: stationDetails.name,
    siteId: stationDetails.localSiteID,
    latitude: stationDetails.location.coordinates[0].toString(),
    longitude: stationDetails.location.coordinates[1].toString(),
    year: selectedYear,
    downloadpollutant: request.params.poll,
    downloadpollutanttype: request.params.freq,
    stationreaddate: request.yar.get('latesttime')
  }

  const downloadResult = await invokeDownload(apiparamsDownload, logger)
  request.yar.set('downloadresult', downloadResult)
}

function buildViewData(
  request,
  stationDetails,
  mapLocation,
  dateContext,
  locationContext
) {
  return {
    pageTitle: english.stationdetails.pageTitle,
    title: english.stationdetails.title,
    serviceName: english.stationdetails.serviceName,
    stationdetails: stationDetails,
    maplocation: mapLocation,
    updatedTime: dateContext.updatedTime,
    displayBacklink: true,
    fullSearchQuery: dateContext.fullSearchQuery,
    years: dateContext.years,
    currentdate: dateContext.currentDate,
    currentYear: dateContext.currentYear,
    pollutantKeys: stationDetails.pollutants,
    maptoggletips: getToggletip(stationDetails.siteType),
    selectedYear: request.yar.get('selectedYear'),
    tabledata: request.yar.get('tabledata'),
    hrefq:
      request.yar.get('nooflocation') === 'single'
        ? `/multiplelocations`
        : `/location/${locationContext.multipleLocID}`
  }
}

const stationDetailsNojsController = {
  handler: async (request, h) => {
    if (!request.yar.get('SiteId')) {
      request.yar.set('SiteId', request.params.id)
    }

    const logger = createLogger()
    if (!request) {
      return h.response('Invalid request')
    }
    // Clear previous session values
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

    handleDownloadParams(request)

    // Validate request and session data

    const monitoringResult = request.yar.get('MonitoringstResult')

    const result = monitoringResult.getmonitoringstation

    const station = result.find((x) => x.id === request.yar.get('SiteId'))

    request.yar.set('stationdetails', station)
    const stationDetails = request.yar.get('stationdetails')

    // Prepare date and location info
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const formattedDate = yesterday.toISOString().split('.')[0] + 'Z'
    request.yar.set('latesttime', formattedDate)
    const updatedTime = parseDateFormat(formattedDate)

    // Generate years array dynamically from 2018 to current year
    const currentYear = new Date().getFullYear()
    const years = buildYearsArray()

    const currentDate = formatCurrentDate()
    const lat = stationDetails.location.coordinates[0]
    const lon = stationDetails.location.coordinates[1]
    const mapLocation = buildMapLocation(lat, lon)

    const fullSearchQuery = request?.yar?.get('fullSearchQuery')?.value
    const multipleLocID = request?.yar?.get('locationID')

    setSelectedYearForNoJs(request)

    const apiparamsTable = {
      siteId: request.yar.get('stationdetails').localSiteID,
      year: request.yar.get('selectedYear')
    }

    const tabledata = await invokeTable(apiparamsTable)

    if (isEmptyTableData(tabledata)) {
      request.yar.set('tabledata', null)
    } else {
      request.yar.set('tabledata', tabledata)
    }

    await maybeHandleDownloadRequest(
      request,
      stationDetails,
      request.yar.get('selectedYear'),
      logger
    )

    const viewData = buildViewData(
      request,
      stationDetails,
      mapLocation,
      {
        updatedTime,
        years,
        currentDate,
        currentYear,
        fullSearchQuery
      },
      { multipleLocID }
    )
    request.yar.set('viewData', viewData)

    return h.view('stationDetailsNojs/index', viewData)
  }
}

export { stationDetailsNojsController }
