import { english } from '~/src/server/data/en/homecontent.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'
import { resolveStationHistory } from '~/src/server/common/helpers/station-helpers.js'
import {
  PERIOD_KEYS,
  historyPeriodFor,
  formatPeriodDates
} from '~/src/server/graph-summary/periods.js'
import { buildPollutantSummary } from '~/src/server/graph-summary/summary.js'
import { buildPollutantGraph } from '~/src/server/graph-summary/graph.js'
import {
  buildGraphSummaryHref,
  buildStationPageHref
} from '~/src/server/graph-summary/links.js'

/**
 * Finds a station among the user's search results. The station pages work from
 * the session, so a station the user has not searched for is not found.
 * @param {object} request
 * @param {string} stationId
 * @returns {object|null}
 */
function findSessionStation(request, stationId) {
  const stations = request.yar.get('MonitoringstResult')?.getmonitoringstation
  if (!Array.isArray(stations)) {
    return null
  }
  return stations.find((station) => station.id === stationId) ?? null
}

function buildPeriodTabs({ stationId, period, nojs, from }) {
  const { periods } = english.graphsummary
  return PERIOD_KEYS.map((key) => ({
    label: periods[key],
    href: buildGraphSummaryHref({ stationId, period: key, nojs, from }),
    isCurrent: key === period
  }))
}

/**
 * Hapi route handler for the graph and pollutant summary page. The query has
 * already been validated and defaulted by graphSummaryQuerySchema.
 */
const graphSummaryController = {
  handler: async (request, h) => {
    const { stationId, period, nojs, from } = request.query
    const station = findSessionStation(request, stationId)
    if (!station) {
      return renderNotFound(h)
    }

    // The station pages work from the session, so point it at this station:
    // that is what the Back link returns to, even if the user has since opened
    // another station in a second tab.
    request.yar.set('SiteId', station.id)
    request.yar.set('stationdetails', station)

    const content = english.graphsummary
    const heading = `${content.periods[period]}: ${station.name}`
    const historyPeriod = historyPeriodFor(period)
    const history = await resolveStationHistory(station, historyPeriod)

    return h.view('graph-summary/index', {
      pageTitle: heading,
      heading,
      dates: formatPeriodDates(period, history),
      periodNavigationLabel: content.periodNavigationLabel,
      periodTabs: buildPeriodTabs({
        stationId: station.id,
        period,
        nojs,
        from
      }),
      verificationBanner: content.verificationBanner,
      summary: buildPollutantSummary(history, historyPeriod),
      graph: buildPollutantGraph(history.history, station.pollutants),
      displayBacklink: true,
      hrefq: buildStationPageHref({ stationId: station.id, nojs, from })
    })
  }
}

export { graphSummaryController }
