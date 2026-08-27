/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

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
    return ['Select a year to continue', 'Add year', '/year-aurn', '', '']
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

    // Validation checks
    const missingSelection = getMissingSelectionError(request)
    if (missingSelection) {
      return renderErrorState(...missingSelection)
    }

    const numberOfLocations = request.yar.get('nooflocation')
    const stationCountError = request.yar.get('stationCountError')
    const stationCountUnavailable = isStationCountUnavailable(
      numberOfLocations,
      stationCountError
    )

    // Only show each tab if the pollutant's datasource includes that category
    // (determined at pollutant-selection time).
    const hasOtherDataSource = hasCategoryWithNetworks(
      datasourceGroups,
      'Other data from Defra'
    )
    const hasNearRealTimeDataSource = hasCategoryWithNetworks(
      datasourceGroups,
      'Near real-time data from Defra'
    )
    const aurnUnavailable = !hasNearRealTimeDataSource
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
      stationcount: stationCountUnavailable ? null : numberOfLocations,
      stationCountUnavailable,
      ukeapNetworks,
      ukeapUnavailable,
      aurnUnavailable,
      aurnPollutantID,
      yearrange: request.yar.get('yearrange'),
      displayBacklink: true,
      hrefq: backUrl,
      finalyear:
        request.yar
          .get('finalyear')
          ?.split(',')
          .map((year) => year.trim()) ?? []
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
