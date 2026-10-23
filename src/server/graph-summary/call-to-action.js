import { config } from '~/src/config/config.js'
import { english } from '~/src/server/data/en/homecontent.js'
import { buildGraphSummaryHref } from '~/src/server/graph-summary/links.js'

/**
 * View model for the "View graph and pollutant summary" button on the station
 * pages. There is no button when the feature is off or there is no station to
 * link to.
 * @param {object} options
 * @param {string} [options.stationId]
 * @param {boolean} [options.nojs] the button is on the no-JavaScript station page
 * @returns {{ buttonText: string, href: string } | null}
 */
function buildViewGraphSummary({ stationId, nojs = false }) {
  if (!config.get('featureFlags.viewGraphSummary') || !stationId) {
    return null
  }

  const { buttonText } = english.graphsummary.callToAction
  return {
    buttonText,
    href: buildGraphSummaryHref({ stationId, nojs })
  }
}

export { buildViewGraphSummary }
