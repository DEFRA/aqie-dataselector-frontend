import { DEFAULT_PERIOD } from '~/src/server/graph-summary/periods.js'

const GRAPH_SUMMARY_PATH = '/stationdetails/graph-summary'

/**
 * Link to the graph and pollutant summary page for a station.
 * @param {object} options
 * @param {string} options.stationId id of the station in the session's search results
 * @param {string} [options.period]
 * @param {boolean} [options.nojs] the user is on the no-JavaScript journey
 * @returns {string}
 */
function buildGraphSummaryHref({
  stationId,
  period = DEFAULT_PERIOD,
  nojs = false
}) {
  const params = new URLSearchParams({ stationId, period })
  if (nojs) {
    params.set('nojs', 'true')
  }
  return `${GRAPH_SUMMARY_PATH}?${params.toString()}`
}

/**
 * Link back to the station page the user came from.
 * @param {object} options
 * @param {string} options.stationId
 * @param {boolean} [options.nojs]
 * @returns {string}
 */
function buildStationPageHref({ stationId, nojs = false }) {
  return nojs
    ? `/stationDetailsNojs/${encodeURIComponent(stationId)}`
    : '/stationdetails'
}

export { GRAPH_SUMMARY_PATH, buildGraphSummaryHref, buildStationPageHref }
