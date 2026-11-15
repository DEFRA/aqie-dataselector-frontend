/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'

/**
 * Returns the map page URL for this environment, or null when the feature is
 * off or the maps service is not configured, so the link is hidden instead of broken.
 */
function buildMapUrl() {
  if (!config.get('featureFlags.searchOnMap')) {
    return null
  }
  const baseUrl = config.get('mapsFrontEnd.url')
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}/map` : null
}

export const hubController = {
  handler(request, h) {
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', new Date().getFullYear().toString())
    request.yar.set('selectedYear', new Date().getFullYear().toString())
    request.yar.set('selectedpollutant', '')
    request.yar.set('selectedyear', '')
    request.yar.set('selectedlocation', '')

    // Clear pollutant-specific session variables
    request.yar.set('selectedPollutants', null)
    request.yar.set('selectedPollutantMode', '')
    request.yar.set('selectedPollutantGroup', '')
    request.yar.set('formattedPollutants', '')

    // Clear year_aurn form-specific session variables
    request.yar.set('yearFormErrors', null)
    request.yar.set('yearFormData', null)
    request.yar.set('TimeSelectionMode', '')
    request.yar.set('yearany', '')
    request.yar.set('startYear', '')
    request.yar.set('endYear', '')
    request.yar.set('startyear_ytd', '')

    // Clear other related session variables including time period
    request.yar.set('selectedTimePeriod', null)
    request.yar.set('yearrange', '')
    request.yar.set('finalyear', '')
    request.yar.set('finalyear1', '')
    request.yar.set('Region', '')
    request.yar.set('selectedLAIDs', '')
    request.yar.set('Location', '')

    return h.view('hubpage/index', {
      pageTitle: englishNew.hub.pageTitle,
      texts: englishNew.hub.texts,
      mapUrl: buildMapUrl()
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
