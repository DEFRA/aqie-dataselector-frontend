/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { networkDescriptions } from '~/src/server/data/en/network-descriptions.js'
import { getNearRealtimeNetworks } from '~/src/server/common/helpers/network-helpers.js'

const OTHER_ONLY = 'other-only'

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

  const nearRealtimeGroups = datasourceGroups.filter(
    (g) => g?.category === CATEGORY_NEAR_REALTIME
  )

  for (const group of nearRealtimeGroups) {
    for (const network of group.networks || []) {
      if (
        network &&
        typeof network === 'object' &&
        !network.id &&
        isAurnNetwork(network)
      ) {
        return network.pollutantID || ''
      }
    }
  }

  for (const group of nearRealtimeGroups) {
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

export const downloadDataselectorController = {
  handler(request, h) {
    const backUrl = '/customdataset'
    const rawDatasourceGroups = request.yar.get('datasourceGroups')
    const datasourceGroups = Array.isArray(rawDatasourceGroups)
      ? rawDatasourceGroups
      : []
    // Helper function to render error state
    const renderErrorState = (
      errormsg,
      errorref1,
      errorhref1,
      errorref2,
      errorhref2
    ) => {
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

      // Store error view data in session
      request.yar.set('errorViewData', errorViewData)

      return h.view('customdataset/index', errorViewData)
    }

    // Zones + other data only: no stations — stay on customdataset, which
    // shows the zone "Change location" error, instead of the download page
    if (
      request.yar.get('Location') === 'Zone' &&
      request.yar.get('downloadDatasourceCategoryType') === OTHER_ONLY
    ) {
      return h.redirect(backUrl)
    }

    // Validation checks
    const missingSelection = getMissingSelectionError(request)
    const numberOfLocations = request.yar.get('nooflocation')
    const combinedNearRealtimeCount = Number(
      request.yar.get('stationCountAURN') ?? numberOfLocations ?? 0
    )
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

    const hasNoNearRealtimeStations =
      stationCountUnavailable || combinedNearRealtimeCount < 1

    if (missingSelection) {
      return renderErrorState(...missingSelection)
    } else if (
      timeperiod === 'last7days' &&
      downloadDatasourceCategoryType === OTHER_ONLY
    ) {
      return renderErrorState(...getOtherOnlyTimePeriodErrorViewModel())
    } else if (
      downloadDatasourceCategoryType === 'near-realtime-only' &&
      hasNoNearRealtimeStations
    ) {
      return renderErrorState(...getMissingStationError())
    } else if (
      downloadDatasourceCategoryType === OTHER_ONLY &&
      nonaurncount < 1
    ) {
      return renderErrorState(...getMissingStationError())
    } else if (
      downloadDatasourceCategoryType === 'both' &&
      nonaurncount < 1 &&
      hasNoNearRealtimeStations
    ) {
      return renderErrorState(...getMissingStationError())
    }

    const hasOtherDataSource = hasCategoryWithNetworks(
      datasourceGroups,
      'Other data from Defra'
    )

    const aurnPollutantID = getAurnPollutantID(datasourceGroups)

    // NON-AURN networks — array of {networkType, count} objects
    const rawUkeap = request.yar.get('nooflocationukeap')
    const ukeapNetworks = Array.isArray(rawUkeap) ? rawUkeap : []
    const ukeapUnavailable = !hasOtherDataSource || ukeapNetworks.length === 0

    // Clear any previous download result to prevent auto-download
    request.yar.set('downloadaurnresult', null)

    // Success case - prepare view data
    const successViewData = {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: null, // Don't auto-download, wait for user to click
      stationcount: stationCountUnavailable ? null : combinedNearRealtimeCount,
      stationCountUnavailable,
      ukeapNetworks,
      ukeapUnavailable,
      aurnPollutantID,
      // Near real-time networks with per-network station counts
      nearRealtimeNetworkCounts: buildNearRealtimeNetworkCounts(
        getNearRealtimeNetworks(datasourceGroups),
        request.yar.get('nearRealtimeStationCounts'),
        numberOfLocations
      ),
      yearrange: request.yar.get('yearrange'),
      displayBacklink: true,
      hrefq: backUrl,
      downloadDatasourceCategoryType,
      datasourceavailability: request.yar.get('Datasourceavailability'),
      timperiodselectionmode: request.yar.get('TimeSelectionMode'),
      finalyear:
        request.yar
          .get('finalyear')
          ?.split(',')
          .map((year) => year.trim()) ?? [],
      networkDescriptions
    }

    // Store success view data in session
    request.yar.set('downloadViewData', successViewData)

    // Success case - render download page
    return h.view('download_dataselector/index', successViewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
