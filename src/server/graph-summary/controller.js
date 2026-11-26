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
  GRAPH_SUMMARY_PATH,
  buildGraphSummaryFields,
  buildStationPageHref
} from '~/src/server/graph-summary/links.js'

// Session key for the station and period last posted to the graph page.
const GRAPH_SUMMARY_SESSION_KEY = 'graphSummary'

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

function buildPeriodTabs({ stationId, period, from }) {
  const { periods } = english.graphsummary
  return PERIOD_KEYS.map((key) => ({
    label: periods[key],
    fields: buildGraphSummaryFields({ stationId, period: key, from }),
    isCurrent: key === period
  }))
}

/**
 * Receives the station and period from the station pages and the period tabs,
 * then redirects to the page (post/redirect/get), so they stay out of the URL
 * and the page can still be refreshed. The payload has already been validated
 * and defaulted by graphSummaryPayloadSchema.
 */
const graphSummaryPostController = {
  handler: (request, h) => {
    const { stationId, period, from } = request.payload
    if (!findSessionStation(request, stationId)) {
      return renderNotFound(h)
    }

    request.yar.set(GRAPH_SUMMARY_SESSION_KEY, { stationId, period, from })
    return h.redirect(GRAPH_SUMMARY_PATH).code(303)
  }
}

/**
 * Renders the graph and pollutant summary page for the station and period last
 * posted to it.
 */
const graphSummaryController = {
  handler: async (request, h) => {
    const { stationId, period, from } =
      request.yar.get(GRAPH_SUMMARY_SESSION_KEY) ?? {}
    const station = stationId ? findSessionStation(request, stationId) : null
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
      periodFormAction: GRAPH_SUMMARY_PATH,
      periodTabs: buildPeriodTabs({
        stationId: station.id,
        period,
        from
      }),
      verificationBanner: content.verificationBanner,
      summary: buildPollutantSummary(history, historyPeriod),
      graph: buildPollutantGraph(history.history, station.pollutants),
      displayBacklink: true,
      hrefq: buildStationPageHref({ from })
    })
  }
}

export {
  graphSummaryController,
  graphSummaryPostController,
  GRAPH_SUMMARY_SESSION_KEY
}
