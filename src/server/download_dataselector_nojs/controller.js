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
const CATEGORY_NEAR_REALTIME = 'Near real-time data from Defra'
const CHANGE_LOCATION_URL = '/location-aurn/nojs'
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

function findPollutantIdInNearRealtimeGroups(groups, predicate) {
  for (const group of groups) {
    for (const network of group.networks || []) {
      const isCandidate =
        network &&
        typeof network === 'object' &&
        !network.id &&
        predicate(network)
      if (isCandidate) {
        return network.pollutantID || ''
      }
    }
  }

  return ''
}

function getAurnPollutantID(datasourceGroups) {
  if (!Array.isArray(datasourceGroups)) {
    return ''
  }

  const nearRealtimeGroups = datasourceGroups.filter(
    (g) => g?.category === CATEGORY_NEAR_REALTIME
  )

  const aurnPollutantId = findPollutantIdInNearRealtimeGroups(
    nearRealtimeGroups,
    (network) => isAurnNetwork(network)
  )
  if (aurnPollutantId) {
    return aurnPollutantId
  }

  return findPollutantIdInNearRealtimeGroups(nearRealtimeGroups, () => true)
}

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

function getNonaurncount(nonaurncount) {
  if (!Array.isArray(nonaurncount)) {
    return 0
  }

  return nonaurncount.reduce((sum, item) => sum + Number(item.count || 0), 0)
}

// Zone + NON-AURN: location only. Zone + AURN and all other locations:
// both time period and location.
function getMissingStationErrorModel(request) {
  if (isZoneWithoutAurn(request)) {
    return {
      errormsg:
        'No monitoring stations are available for your selection. Please try:',
      errorref1: 'Change location',
      errorhref1: CHANGE_LOCATION_URL
    }
  }

  return {
    errormsg:
      'No monitoring stations are available for your selection. Please try:',
    errorref1: 'Change time period',
    errorhref1: CHANGE_TIME_PERIOD_URL,
    errorref2: 'Change location',
    errorhref2: CHANGE_LOCATION_URL
  }
}

function getOtherOnlyTimePeriodErrorModel() {
  return {
    errormsg:
      'There are no stations available based on your selection. Change time period',
    errorref1: 'Change time period',
    errorhref1: CHANGE_TIME_PERIOD_URL,
    errorref2: '',
    errorhref2: ''
  }
}

const getStationCount = (request) => {
  const raw =
    request.yar.get('nooflocation') ?? request.yar.get('stationcount') ?? 0

  const num = Number(raw)

  return Number.isFinite(num) ? num : 0
}

const buildViewData = (request, backUrl) => {
  const rawUkeap = request.yar.get('nooflocationukeap')
  const ukeapNetworks = Array.isArray(rawUkeap) ? rawUkeap : []

  const datasourceGroups = request.yar.get('datasourceGroups') || []

  const aurnPollutantID = getAurnPollutantID(datasourceGroups)

  const hasOtherDataSource = hasCategoryWithNetworks(
    datasourceGroups,
    'Other data from Defra'
  )

  const ukeapUnavailable = !hasOtherDataSource || ukeapNetworks.length === 0

  const nearRealtimeNetworkCounts = buildNearRealtimeNetworkCounts(
    getNearRealtimeNetworks(datasourceGroups),
    request.yar.get('nearRealtimeStationCounts'),
    getStationCount(request)
  )

  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    downloadaurnresult: request.yar.get('downloadaurnresult'),
    downloadukeapresult: request.yar.get('downloadukeapresult'),
    stationcount: getStationCount(request),
    ukeapNetworks,
    ukeapUnavailable,
    // Non-AURN only pollutant: hide the near real-time (AURN) tab
    aurnUnavailable: getDownloadCategoryType(request) === OTHER_ONLY,
    aurnPollutantID,
    // Near real-time networks with per-network station counts
    nearRealtimeNetworkCounts,
    yearrange: request.yar.get('yearrange'),
    hrefq: backUrl,
    finalyear:
      request.yar
        .get('finalyear')
        ?.split(',')
        .map((year) => year.trim()) ?? [],
    networkDescriptions
  }
}

const renderErrorState = (h, request, backUrl, errorDetails) => {
  const { errormsg, errorref1, errorhref1, errorref2, errorhref2 } =
    errorDetails

  return h.view('customdataset/index', {
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
    hrefq: backUrl
  })
}

const validateSelectedPollutant = (request, h, backUrl) => {
  const selectedPollutant = request.yar.get('selectedpollutant')

  if (!selectedPollutant || selectedPollutant.length === 0) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a pollutant to continue',
      errorref1: 'Add pollutant',
      errorhref1: '/airpollutant/nojs',
      errorref2: '',
      errorhref2: ''
    })
  }

  return null
}

const validateSelectedYear = (request, h, backUrl) => {
  const selectedYear = request.yar.get('selectedyear')

  if (!selectedYear) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a timeperiod to continue',
      errorref1: 'Add time period',
      errorhref1: '/year-aurn',
      errorref2: '',
      errorhref2: ''
    })
  }

  return null
}

const validateSelectedLocation = (request, h, backUrl) => {
  const selectedLocation = request.yar.get('selectedlocation')

  if (!selectedLocation) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a location to continue',
      errorref1: 'Add location',
      errorhref1: CHANGE_LOCATION_URL,
      errorref2: '',
      errorhref2: ''
    })
  }

  return null
}

function buildNoJsViewModel(request) {
  const downloadForceNearRealtimeOnly = Boolean(
    request.yar.get('downloadForceNearRealtimeOnly')
  )

  const datasourceCategoryType =
    request.yar.get('downloadDatasourceCategoryType') ||
    request.yar.get('datasourceCategoryType') ||
    'unknown'

  const datasourceGroups = downloadForceNearRealtimeOnly
    ? request.yar.get('downloadDatasourceGroups') || []
    : request.yar.get('datasourceGroups') || []

  return {
    datasourceGroups,
    datasourceCategoryType,
    downloadForceNearRealtimeOnly,
    TimeSelectionMode: request.yar.get('TimeSelectionMode'),
    selectedyear: request.yar.get('selectedyear')
  }
}

function getDownloadCategoryType(request) {
  return (
    request.yar.get('downloadDatasourceCategoryType') ||
    request.yar.get('datasourceCategoryType')
  )
}

// Zones + NON-AURN (no AURN network): no stations — stay on customdataset,
// which shows the zone "Change location" error, instead of the download page
function isZoneWithoutAurn(request) {
  return (
    request.yar.get('Location') === 'Zone' &&
    !hasAurnNetwork(request.yar.get('datasourceGroups'))
  )
}

// First missing pollutant / year / location error view, or null
function getSelectionError(request, h, backUrl) {
  return (
    validateSelectedPollutant(request, h, backUrl) ||
    validateSelectedYear(request, h, backUrl) ||
    validateSelectedLocation(request, h, backUrl)
  )
}

// True when the AURN station count is unavailable or zero
function hasNoAurnStations(request) {
  const numberOfLocations = request.yar.get('nooflocation')
  const combinedNearRealtimeCount = Number(
    request.yar.get('stationCountAURN') ?? numberOfLocations ?? 0
  )

  return (
    isStationCountUnavailable(
      numberOfLocations,
      request.yar.get('stationCountError')
    ) || combinedNearRealtimeCount < 1
  )
}

// True when there are no stations for the selected datasource category
function hasMissingStations(request, categoryType) {
  const noOtherStations =
    getNonaurncount(request.yar.get('nooflocationukeap')) < 1

  if (categoryType === 'near-realtime-only') {
    return hasNoAurnStations(request)
  }
  if (categoryType === OTHER_ONLY) {
    return noOtherStations
  }
  if (categoryType === 'both') {
    return noOtherStations && hasNoAurnStations(request)
  }
  return false
}

export const downloadDataselectornojsController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    if (request.method === 'get') {
      return h.view(
        'download_dataselector_nojs/index',
        buildViewData(request, backUrl)
      )
    }

    if (isZoneWithoutAurn(request)) {
      return h.redirect(backUrl)
    }

    const selectionError = getSelectionError(request, h, backUrl)
    if (selectionError) {
      return selectionError
    }

    const categoryType = getDownloadCategoryType(request)

    if (
      request.yar.get('TimeSelectionMode') === 'last7days' &&
      categoryType === OTHER_ONLY
    ) {
      return renderErrorState(
        h,
        request,
        backUrl,
        getOtherOnlyTimePeriodErrorModel()
      )
    }

    if (hasMissingStations(request, categoryType)) {
      return renderErrorState(
        h,
        request,
        backUrl,
        getMissingStationErrorModel(request)
      )
    }

    const viewData = buildViewData(request, backUrl)

    request.yar.set('viewDatanojs', viewData)

    return h.view('download_dataselector_nojs/index', {
      ...viewData,
      ...buildNoJsViewModel(request)
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
