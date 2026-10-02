/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { networkDescriptions } from '~/src/server/data/en/network-descriptions.js'

const OTHER_ONLY = 'other-only'

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

function getMissingStationErrorModel() {
  return {
    errormsg:
      'No monitoring stations are available for your selection. Please try:',
    errorref1: 'Change time period',
    errorhref1: '/year-aurn/change',
    errorref2: 'Change location',
    errorhref2: '/location-aurn/nojs'
  }
}

function getOtherOnlyTimePeriodErrorModel() {
  return {
    errormsg:
      'There are no stations available based on your selection. Change time period',
    errorref1: 'Change time period',
    errorhref1: '/year-aurn/change',
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
      errorhref1: '/location-aurn/nojs',
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

// Zones + other data only: no stations — stay on customdataset, which
// shows the zone "Change location" error, instead of the download page
function isZoneOtherOnly(request) {
  return (
    request.yar.get('Location') === 'Zone' &&
    getDownloadCategoryType(request) === OTHER_ONLY
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
  return (
    isStationCountUnavailable(
      numberOfLocations,
      request.yar.get('stationCountError')
    ) ||
    numberOfLocations === 0 ||
    numberOfLocations === ''
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

    if (isZoneOtherOnly(request)) {
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
        getMissingStationErrorModel()
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
