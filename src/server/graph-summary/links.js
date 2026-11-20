import { DEFAULT_PERIOD } from '~/src/server/graph-summary/periods.js'

const GRAPH_SUMMARY_PATH = '/stationdetails/graph-summary'

// The station page tabs the graph page can return to, by the `from` query
// value. The Daily Air Quality Index tab is the default view, so it needs no
// `from`. A year tab is its four digit year.
const STATION_TAB_PATHS = {
  last24hours: '/stationdetails/last-24-hours',
  last7days: '/stationdetails/last-7-days'
}
const YEAR_PATTERN = /^\d{4}$/

/**
 * The station page path of the tab a `from` value names.
 * @param {string|number} [from]
 * @returns {string|null} null when `from` is not a tab the graph page can return to
 */
function stationTabPath(from) {
  const tab = String(from ?? '')
  if (Object.hasOwn(STATION_TAB_PATHS, tab)) {
    return STATION_TAB_PATHS[tab]
  }
  return YEAR_PATTERN.test(tab) ? `/stationdetails/year/${tab}` : null
}

/**
 * Whether a `from` value names a tab the graph page can return to.
 * @param {string|number} [from]
 * @returns {boolean}
 */
function isStationTab(from) {
  return stationTabPath(from) !== null
}

/**
 * Link to the graph and pollutant summary page for a station.
 * @param {object} options
 * @param {string} options.stationId id of the station in the session's search results
 * @param {string} [options.period]
 * @param {string|number} [options.from] the station page tab the link is on, so
 *   Back returns to it: last24hours, last7days or a year. It is left out when it
 *   names no such tab, so a bad value in the session cannot break the link.
 * @returns {string}
 */
function buildGraphSummaryHref({ stationId, period = DEFAULT_PERIOD, from }) {
  const params = new URLSearchParams({ stationId, period })
  if (isStationTab(from)) {
    params.set('from', String(from))
  }
  return `${GRAPH_SUMMARY_PATH}?${params.toString()}`
}

/**
 * Link back to the station page the user came from: the tab named by `from`,
 * or the default view when there is none.
 * @param {object} options
 * @param {string} [options.from] as in buildGraphSummaryHref
 * @returns {string}
 */
function buildStationPageHref({ from }) {
  return stationTabPath(from) ?? '/stationdetails'
}

export {
  GRAPH_SUMMARY_PATH,
  isStationTab,
  buildGraphSummaryHref,
  buildStationPageHref
}
