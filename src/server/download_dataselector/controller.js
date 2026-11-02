/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { networkDescriptions } from '~/src/server/data/en/network-descriptions.js'
import {
  getNearRealtimeNetworks,
  hasAurnNetwork
} from '~/src/server/common/helpers/network-helpers.js'

const OTHER_ONLY = 'other-only'
const CHANGE_LOCATION_URL = '/location-aurn/change'
const CHANGE_TIME_PERIOD_URL = '/year-aurn/change'

function normalizeNetworkName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function buildNearRealtimeNetworkCounts(
  nearRealtimeNetworks,
  nearRealtimeStationCounts,
  fallbackStationCount
) {
  const displayNetworks = Array.isArray(nearRealtimeNetworks)
    ? nearRealtimeNetworks
    : []
  const countRows = Array.isArray(nearRealtimeStationCounts)
    ? nearRealtimeStationCounts
    : []

  if (countRows.length === 0) {
    return displayNetworks.map((network, index) => ({
      ...network,
      pollutantID: '',
      count: index === 0 ? Number(fallbackStationCount) || 0 : 0
    }))
  }

  let hasNameMatch = false
  const mapped = displayNetworks.map((network, index) => {
    const match = countRows.find(
      (row) =>
        normalizeNetworkName(row.name) === normalizeNetworkName(network.name)
    )

    if (match) {
      hasNameMatch = true
    }

    const fallbackRow = match ? null : countRows[index]

    return {
      ...network,
      pollutantID: match?.pollutantID || fallbackRow?.pollutantID || '',
      count: Number(match?.count ?? fallbackRow?.count ?? 0)
    }
  })

  const mappedTotal = mapped.reduce((sum, n) => sum + (Number(n.count) || 0), 0)
  if (
    (!hasNameMatch || mappedTotal === 0) &&
    Number(fallbackStationCount) > 0
  ) {
    mapped[0] = {
      ...mapped[0],
      count: Number(fallbackStationCount)
    }
  }

  return mapped
}
const CATEGORY_NEAR_REALTIME = 'Near real-time data from Defra'

function isAurnNetwork(network) {
  const abbreviation = String(network?.abbreviation || '')
    .toUpperCase()
    .trim()
  const name =
    typeof network === 'string'
      ? network
      : `${network?.name || ''} ${network?.fullName || ''}`

  return (
    abbreviation === 'AURN' ||
    /\baurn\b|automatic\s+urban\s+and\s+rural/i.test(name)
  )
}

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

// Zone + NON-AURN (no AURN network) has no stations for a zone
function isZoneOrAgglomerationWithoutAurn(request) {
  const location = request.yar.get('Location')

  return (
    (location === 'Zone' || location === 'Agglomeration') &&
    !hasAurnNetwork(request.yar.get('datasourceGroups'))
  )
}

// Zone + NON-AURN: location only. Zone + AURN and all other locations:
// both time period and location.
function getMissingStationError(request) {
  if (isZoneOrAgglomerationWithoutAurn(request)) {
    return [
      'No monitoring stations are available for your selection. Please try:',
      'Change location',
      CHANGE_LOCATION_URL
    ]
  }

  return [
    'No monitoring stations are available for your selection. Please try:',
    'Change time period',
    CHANGE_TIME_PERIOD_URL,
    'Change location',
    CHANGE_LOCATION_URL
  ]
}
function getOtherOnlyTimePeriodErrorViewModel() {
  return [
    'There are no stations available based on your selection. Change time period',
    'Change time period',
    CHANGE_TIME_PERIOD_URL
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
      CHANGE_LOCATION_URL,
      '',
      ''
    ]
  }
  return null
}

function isNetworkWithoutId(network) {
  return Boolean(network) && typeof network === 'object' && !network.id
}

function getAurnPollutantID(datasourceGroups) {
  if (!Array.isArray(datasourceGroups)) {
    return ''
  }

  const candidates = datasourceGroups
    .filter((g) => g?.category === CATEGORY_NEAR_REALTIME)
    .flatMap((group) => group.networks || [])
    .filter(isNetworkWithoutId)

  const network = candidates.find(isAurnNetwork) ?? candidates[0]
  return network?.pollutantID || ''
}
function getNonaurncount(nonaurncount) {
  if (!Array.isArray(nonaurncount)) {
    return 0
  }
  return nonaurncount.reduce((sum, item) => sum + Number(item.count || 0), 0)
}

function renderErrorState(request, h, backUrl, datasourceGroups, errorModel) {
  const [errormsg, errorref1, errorhref1, errorref2, errorhref2] = errorModel
  const errorViewData = {
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

  request.yar.set('errorViewData', errorViewData)
  return h.view('customdataset/index', errorViewData)
}

// True when the selected datasource category has no stations to download.
function hasNoStationsForCategory(validation) {
  const {
    downloadDatasourceCategoryType,
    nonaurncount,
    hasNoNearRealtimeStations
  } = validation
  const hasNoOtherStations = nonaurncount < 1

  switch (downloadDatasourceCategoryType) {
    case 'near-realtime-only':
      return hasNoNearRealtimeStations
    case OTHER_ONLY:
      return hasNoOtherStations
    case 'both':
      return hasNoOtherStations && hasNoNearRealtimeStations
    default:
      return false
  }
}

function getValidationErrorModel(request, validation) {
  const { missingSelection, timeperiod, downloadDatasourceCategoryType } =
    validation

  if (missingSelection) {
    return missingSelection
  }
  if (
    timeperiod === 'last7days' &&
    downloadDatasourceCategoryType === OTHER_ONLY
  ) {
    return getOtherOnlyTimePeriodErrorViewModel()
  }
  if (hasNoStationsForCategory(validation)) {
    return getMissingStationError(request)
  }

  return null
}

function getValidationContext(request) {
  const numberOfLocations = request.yar.get('nooflocation')
  const combinedNearRealtimeCount = Number(
    request.yar.get('stationCountAURN') ?? numberOfLocations ?? 0
  )
  const stationCountError = request.yar.get('stationCountError')

  const stationCountUnavailable = isStationCountUnavailable(
    numberOfLocations,
    stationCountError
  )

  return {
    missingSelection: getMissingSelectionError(request),
    numberOfLocations,
    stationCountUnavailable,
    hasNoNearRealtimeStations:
      stationCountUnavailable || combinedNearRealtimeCount < 1,
    nonaurncount: getNonaurncount(request.yar.get('nooflocationukeap')),
    timeperiod: request.yar.get('TimeSelectionMode'),
    downloadDatasourceCategoryType: request.yar.get(
      'downloadDatasourceCategoryType'
    ),
    combinedNearRealtimeCount
  }
}

function buildSuccessViewData(
  request,
  backUrl,
  datasourceGroups,
  validation,
  hasOtherDataSource,
  aurnPollutantID
) {
  const rawUkeap = request.yar.get('nooflocationukeap')
  const ukeapNetworks = Array.isArray(rawUkeap) ? rawUkeap : []
  const ukeapUnavailable = !hasOtherDataSource || ukeapNetworks.length === 0

  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    downloadaurnresult: null,
    stationcount: validation.stationCountUnavailable
      ? null
      : validation.combinedNearRealtimeCount,
    stationCountUnavailable: validation.stationCountUnavailable,
    ukeapNetworks,
    ukeapUnavailable,
    aurnPollutantID,
    nearRealtimeNetworkCounts: buildNearRealtimeNetworkCounts(
      getNearRealtimeNetworks(datasourceGroups),
      request.yar.get('nearRealtimeStationCounts'),
      validation.numberOfLocations
    ),
    yearrange: request.yar.get('yearrange'),
    displayBacklink: true,
    hrefq: backUrl,
    downloadDatasourceCategoryType: validation.downloadDatasourceCategoryType,
    datasourceavailability: request.yar.get('Datasourceavailability'),
    timperiodselectionmode: request.yar.get('TimeSelectionMode'),
    finalyear:
      request.yar
        .get('finalyear')
        ?.split(',')
        .map((year) => year.trim()) ?? [],
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

    // Zones + NON-AURN: no stations — stay on customdataset, which
    // shows the zone "Change location" error, instead of the download page
    if (isZoneOrAgglomerationWithoutAurn(request)) {
      return h.redirect(backUrl)
    }
    const validation = getValidationContext(request)
    const errorModel = getValidationErrorModel(request, validation)
    if (errorModel) {
      return renderErrorState(request, h, backUrl, datasourceGroups, errorModel)
    }

    const hasOtherDataSource = hasCategoryWithNetworks(
      datasourceGroups,
      'Other data from Defra'
    )

    const aurnPollutantID = getAurnPollutantID(datasourceGroups)

    // Clear any previous download result to prevent auto-download
    request.yar.set('downloadaurnresult', null)

    const successViewData = buildSuccessViewData(
      request,
      backUrl,
      datasourceGroups,
      validation,
      hasOtherDataSource,
      aurnPollutantID
    )

    // Store success view data in session
    request.yar.set('downloadViewData', successViewData)

    // Success case - render download page
    return h.view('download_dataselector/index', successViewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
