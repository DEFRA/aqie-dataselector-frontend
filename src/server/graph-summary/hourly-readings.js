import { config } from '~/src/config/config.js'
import { english } from '~/src/server/data/en/homecontent.js'
import { buildPollutantGraph } from '~/src/server/graph-summary/graph.js'

/**
 * One period's hourly readings as a collapsed table, for the station page's
 * Daily Air Quality Index and Last 7 days tabs. Without JavaScript those tabs
 * have no graph button, so this gives their users the data the graph page would.
 * It is built from the history the tab has already fetched, so it costs no
 * extra API call. There is nothing when the feature is off or the history has
 * no readings for the station's pollutants.
 * @param {object|undefined} history the raw /monitoringStationHistory response
 * @param {string[]} [stationPollutants] display names the station measures
 * @param {string} period a graph page period: last24hours or last7days
 * @returns {{ period: string, title: string, table: object } | null}
 */
function buildHourlyReadings(history, stationPollutants, period) {
  if (!config.get('featureFlags.viewGraphSummary')) {
    return null
  }

  const { table } = buildPollutantGraph(history, stationPollutants)
  if (!table) {
    return null
  }

  const { hourlyReadings } = english.graphsummary
  return {
    period,
    title: hourlyReadings.titles[period],
    table: { ...table, caption: hourlyReadings.captions[period] }
  }
}

export { buildHourlyReadings }
