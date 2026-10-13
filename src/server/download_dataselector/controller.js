/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { networkDescriptions } from '~/src/server/data/en/network-descriptions.js'
import { getNearRealtimeNetworks } from '~/src/server/common/helpers/network-helpers.js'

const OTHER_ONLY = 'other-only'

// True when the datasource groups contain the given category with networks.
function hasCategoryWithNetworks(datasourceGroups, category) {
  if (!Array.isArray(datasourceGroups)) {
    return false
  }

  return datasourceGroups.some(
    (g) =>
      g.category === category &&
      Array.isArray(g.networks) &&
      g.networks.length > 0
  )
}

// API error — proceed to download page but flag AURN count as unavailable.
// Arrays are NOT errors (NON-AURN returns [{networkType, count}]).
function isStationCountUnavailable(numberOfLocations, stationCountError) {
  return Boolean(
    stationCountError ||
      numberOfLocations == null ||
      numberOfLocations instanceof Error ||
      (typeof numberOfLocations === 'object' &&
        !Array.isArray(numberOfLocations) &&
        numberOfLocations !== null)
  )
}

function getMissingStationError() {
  return [
    'No monitoring stations are available for your selection. Please try:',
    'Change time period',
    '/year-aurn/change',
    'Change location',
    '/location-aurn/change'
  ]
}
function getOtherOnlyTimePeriodErrorViewModel() {
  return [
    'There are no stations available based on your selection. Change time period',
    'Change time period',
    '/year-aurn/change'
  ]
}

// Returns error view params [msg, ref1, href1, ref2, href2] when a required
// selection is missing, otherwise null.
function getMissingSelectionError(request) {
  const selectedPollutant = request.yar.get('selectedpollutant')
  if (!selectedPollutant || selectedPollutant.length === 0) {
    return [
      'Select a pollutant to continue',
      'Add pollutant',
      '/airpollutant',
      '',
      ''
    ]
  }
  if (!request.yar.get('selectedyear')) {
    return [
      'Select a timeperiod to continue',
      'Add time period',
      '/year-aurn',
      '',
      ''
    ]
  }
  if (!request.yar.get('selectedlocation')) {
    return [
      'Select a location to continue',
      'Add location',
      '/location-aurn/change',
      '',
      ''
    ]
  }
  return null
}

function getAurnPollutantID(datasourceGroups) {
  if (!Array.isArray(datasourceGroups)) {
    return ''
  }

  for (const group of datasourceGroups) {
    for (const network of group.networks || []) {
      if (network && typeof network === 'object' && !network.id) {
        return network.pollutantID || ''
      }
    }
  }

  return ''
}
function getNonaurncount(nonaurncount) {
  if (!Array.isArray(nonaurncount)) {
    return 0
  }
  return nonaurncount.reduce((sum, item) => sum + Number(item.count || 0), 0)
}

// True when zones + other-data-only have no stations - stay on
// customdataset, which shows the zone "Change location" error, instead
// of the download page.
function isZoneWithOtherDataOnly(request) {
  return (
    request.yar.get('Location') === 'Zone' &&
    request.yar.get('downloadDatasourceCategoryType') === OTHER_ONLY
  )
}

function isZeroOrEmpty(value) {
  return value === 0 || value === ''
}

// Gathers the session values the availability checks and success view both
// need, computing aurnMissing once so getAvailabilityError doesn't have to.
function buildAvailabilityContext(request) {
  const numberOfLocations = request.yar.get('nooflocation')
  const stationCountError = request.yar.get('stationCountError')
  const nonaurncount = getNonaurncount(request.yar.get('nooflocationukeap'))
  const timeperiod = request.yar.get('TimeSelectionMode')
  const downloadDatasourceCategoryType = request.yar.get(
    'downloadDatasourceCategoryType'
  )
  const stationCountUnavailable = isStationCountUnavailable(
    numberOfLocations,
    stationCountError
  )

  return {
    numberOfLocations,
    nonaurncount,
    timeperiod,
    downloadDatasourceCategoryType,
    stationCountUnavailable,
    aurnMissing: stationCountUnavailable || isZeroOrEmpty(numberOfLocations)
  }
}

// Returns an error view-model array when the session's current selection
// has no data to show, otherwise null.
function getAvailabilityError({
  downloadDatasourceCategoryType,
  timeperiod,
  aurnMissing,
  nonaurncount
}) {
  if (
    timeperiod === 'last7days' &&
    downloadDatasourceCategoryType === OTHER_ONLY
  ) {
    return getOtherOnlyTimePeriodErrorViewModel()
  }

  if (downloadDatasourceCategoryType === 'near-realtime-only' && aurnMissing) {
    return getMissingStationError()
  }

  if (downloadDatasourceCategoryType === OTHER_ONLY && nonaurncount < 1) {
    return getMissingStationError()
  }

  if (
    downloadDatasourceCategoryType === 'both' &&
    nonaurncount < 1 &&
    aurnMissing
  ) {
    return getMissingStationError()
  }

  return null
}

function buildErrorViewData(request, backUrl, datasourceGroups, errorParams) {
  const [errormsg, errorref1, errorhref1, errorref2, errorhref2] = errorParams

  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    error: true,
    errormsg,
    errorref1,
    errorhref1,
    errorref2,
    errorhref2,
    selectedpollutant: request.yar.get('selectedpollutant'),
    selectedyear: request.yar.get('selectedyear'),
    selectedlocation: request.yar.get('selectedlocation'),
    stationcount: request.yar.get('nooflocation'),
    stationcountukeap: request.yar.get('nooflocationukeap'),
    datasourceGroups,
    displayBacklink: true,
    hrefq: backUrl
  }
}

function renderErrorState(request, h, backUrl, datasourceGroups, errorParams) {
  const errorViewData = buildErrorViewData(
    request,
    backUrl,
    datasourceGroups,
    errorParams
  )

  // Store error view data in session
  request.yar.set('errorViewData', errorViewData)

  return h.view('customdataset/index', errorViewData)
}

function getFinalYears(request) {
  const finalyear = request.yar.get('finalyear')
  if (!finalyear) {
    return []
  }
  return finalyear.split(',').map((year) => year.trim())
}

function buildSuccessViewData(request, backUrl, datasourceGroups, context) {
  const { numberOfLocations, stationCountUnavailable } = context
  const hasOtherDataSource = hasCategoryWithNetworks(
    datasourceGroups,
    'Other data from Defra'
  )
  const aurnPollutantID = getAurnPollutantID(datasourceGroups)

  // NON-AURN networks — array of {networkType, count} objects
  const rawUkeap = request.yar.get('nooflocationukeap')
  const ukeapNetworks = Array.isArray(rawUkeap) ? rawUkeap : []
  const ukeapUnavailable = !hasOtherDataSource || ukeapNetworks.length === 0

  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    downloadaurnresult: null, // Don't auto-download, wait for user to click
    stationcount: stationCountUnavailable ? null : numberOfLocations,
    stationCountUnavailable,
    ukeapNetworks,
    ukeapUnavailable,
    aurnPollutantID,
    // Near real-time networks from the datasource API (display only)
    nearRealtimeNetworks: getNearRealtimeNetworks(datasourceGroups),
    yearrange: request.yar.get('yearrange'),
    displayBacklink: true,
    hrefq: backUrl,
    downloadDatasourceCategoryType: context.downloadDatasourceCategoryType,
    datasourceavailability: request.yar.get('Datasourceavailability'),
    timperiodselectionmode: request.yar.get('TimeSelectionMode'),
    finalyear: getFinalYears(request),
    networkDescriptions
  }
}

export const downloadDataselectorController = {
  handler(request, h) {
    const backUrl = '/customdataset'
    const rawDatasourceGroups = request.yar.get('datasourceGroups')
    const datasourceGroups = Array.isArray(rawDatasourceGroups)
      ? rawDatasourceGroups
      : []

    if (isZoneWithOtherDataOnly(request)) {
      return h.redirect(backUrl)
    }

    const missingSelection = getMissingSelectionError(request)
    if (missingSelection) {
      return renderErrorState(
        request,
        h,
        backUrl,
        datasourceGroups,
        missingSelection
      )
    }

    const context = buildAvailabilityContext(request)
    const availabilityError = getAvailabilityError(context)
    if (availabilityError) {
      return renderErrorState(
        request,
        h,
        backUrl,
        datasourceGroups,
        availabilityError
      )
    }

    // Clear any previous download result to prevent auto-download
    request.yar.set('downloadaurnresult', null)

    // Success case - prepare and store view data, then render
    const successViewData = buildSuccessViewData(
      request,
      backUrl,
      datasourceGroups,
      context
    )
    request.yar.set('downloadViewData', successViewData)

    return h.view('download_dataselector/index', successViewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
