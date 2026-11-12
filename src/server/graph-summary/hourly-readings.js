import { config } from '~/src/config/config.js'
import { english } from '~/src/server/data/en/homecontent.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { resolveStationHistory } from '~/src/server/common/helpers/station-helpers.js'
import {
  PERIOD_KEYS,
  historyPeriodFor
} from '~/src/server/graph-summary/periods.js'
import { buildPollutantGraph } from '~/src/server/graph-summary/graph.js'

const logger = createLogger()

/**
 * The hourly readings for the last 24 hours and the last 7 days as tables, for
 * the no-JavaScript station page. That page has no graph button, so this gives
 * its users the data the graph page would. The two periods are fetched
 * together. A period with no readings (no AURN site id, a failed call or an
 * empty response) is left out, and so is everything when the feature is off.
 * @param {object} station a station from the session's search results
 * @returns {Promise<Array<{ period: string, title: string, verificationBanner: string, table: object }>>}
 */
async function buildHourlyReadings(station) {
  if (!config.get('featureFlags.viewGraphSummary')) {
    return []
  }

  const { hourlyReadings, verificationBanner } = english.graphsummary
  const sections = await Promise.all(
    PERIOD_KEYS.map(async (period) => {
      try {
        const { history } = await resolveStationHistory(
          station,
          historyPeriodFor(period)
        )
        const { table } = buildPollutantGraph(history, station.pollutants)
        return (
          table && {
            period,
            title: hourlyReadings.titles[period],
            verificationBanner,
            table: { ...table, caption: hourlyReadings.captions[period] }
          }
        )
      } catch (error) {
        // The readings are extra to the page, so a bad response must not break it
        logger.warn(`Hourly readings error (${period}): ${error.message}`)
        return null
      }
    })
  )

  return sections.filter(Boolean)
}

export { buildHourlyReadings }
