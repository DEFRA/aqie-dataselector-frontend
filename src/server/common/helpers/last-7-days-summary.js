/**
 * Maps aqie-back-end's GET /monitoringStationHistory `summary` block onto the
 * per-pollutant rows last7daystable.njk renders.
 *
 * Nothing is calculated here. Data capture, the 75% rule that withholds an
 * average, exceedance counts and the unrounded means all come from
 * aqie-back-end, which applies one set of rules to the DAQI, Last 24 hours and
 * Last 7 days views. The only arithmetic left is the final display rounding of
 * the average, which the acceptance criteria require to happen last.
 */

import {
  POLLUTANT_DISPLAY_NAMES,
  displayAverage,
  startOfHourEndingAt
} from '~/src/server/common/helpers/history-summary-shared.js'

const NO_LEGAL_LIMIT = 'no legal limit'

// A window of seven complete UTC days runs from 01:00 on the first day to
// 00:00 after the last, so periodStart/periodEnd shift each stamp back an hour
// to land on the days the page labels ("20 October to 26 October").

/** A null count means the pollutant has no legal limit of that kind. */
function displayCount(count) {
  return count ?? NO_LEGAL_LIMIT
}

function toRow(code, summary) {
  return {
    pollutantName: POLLUTANT_DISPLAY_NAMES[code] ?? code,
    dataCapturePercentage: summary.dataCapture.capturePercentage,
    lowDataCapture: summary.dataCapture.isLowDataCapture,
    average: displayAverage(summary.periodAverage),
    dailyCount: displayCount(summary.dailyExceedances),
    hourlyCount: displayCount(summary.hourlyExceedances)
  }
}

/**
 * @param {{ from: string, to: string, summary?: { pollutants: Record<string, {
 *   periodAverage: number|null,
 *   dataCapture: { capturePercentage: number, isLowDataCapture: boolean },
 *   hourlyExceedances: number|null,
 *   dailyExceedances: number|null
 * }> } }} history aqie-back-end's /monitoringStationHistory response. A
 *   response with no `summary` (for example from a back end that has not been
 *   updated yet) produces no rows, so the page shows its no-data message
 *   instead of figures this service would have to invent.
 * @param {string[]} stationPollutants display names the station actually
 *   monitors (station.pollutants). The response includes all five codes
 *   regardless, so this filters (and orders) the rows to match the rest of the
 *   page.
 * @returns {{periodStart: string, periodEnd: string, latestReadingAt: string, pollutants: object[]}}
 */
function summariseStationHistory(history, stationPollutants = []) {
  const rowsByDisplayName = new Map(
    Object.entries(history.summary?.pollutants ?? {}).map(([code, summary]) => [
      POLLUTANT_DISPLAY_NAMES[code] ?? code,
      toRow(code, summary)
    ])
  )

  return {
    periodStart: startOfHourEndingAt(history.from),
    periodEnd: startOfHourEndingAt(history.to),
    latestReadingAt: history.to,
    pollutants: stationPollutants
      .filter((name) => rowsByDisplayName.has(name))
      .map((name) => rowsByDisplayName.get(name))
  }
}

export { summariseStationHistory }
