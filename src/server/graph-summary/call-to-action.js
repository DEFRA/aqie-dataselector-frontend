import { config } from '~/src/config/config.js'
import { english } from '~/src/server/data/en/homecontent.js'
import { buildGraphSummaryHref } from '~/src/server/graph-summary/links.js'

/**
 * View model for the "View graph and pollutant summary" button on the station
 * pages. There is no button when the feature is off or there is no station to
 * link to.
 * @param {object} options
 * @param {string} [options.stationId]
 * @param {string} [options.period] the graph page's period to open on, such as
 *   last7days; the last 24 hours when not given
 * @param {string|number} [options.from] the station page tab the button is on,
 *   so Back returns to it: last24hours, last7days or a year. The Daily Air
 *   Quality Index tab is the default view, so it gives none.
 * @param {boolean} [options.nojs] the button is on the no-JavaScript station page
 * @returns {{ buttonText: string, href: string } | null}
 */
function buildViewGraphSummary({ stationId, period, from, nojs = false }) {
  if (!config.get('featureFlags.viewGraphSummary') || !stationId) {
    return null
  }

  const { buttonText } = english.graphsummary.callToAction
  return {
    buttonText,
    href: buildGraphSummaryHref({ stationId, period, from, nojs })
  }
}

export { buildViewGraphSummary }
