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

const NOT_APPLICABLE = '-'
const NO_LEGAL_LIMIT = 'no legal limit'
const MS_PER_HOUR = 60 * 60 * 1000

/**
 * aqie-back-end stamps each hour with the time it ends, so a window of seven
 * complete UTC days runs from 01:00 on the first day to 00:00 after the last.
 * The hour that ends at a stamp began an hour earlier, which puts it on the day
 * the page should label ("20 October to 26 October").
 */
function startOfHourEndingAt(stamp) {
  return stamp ? new Date(Date.parse(stamp) - MS_PER_HOUR).toISOString() : stamp
}

/** aqie-back-end's pollutant keys to the display names last7daystable.njk uses. */
const POLLUTANT_DISPLAY_NAMES = {
  PM25: 'PM2.5',
  PM10: 'PM10',
  NO2: 'Nitrogen dioxide',
  O3: 'Ozone',
  SO2: 'Sulphur dioxide'
}

/** An average withheld for low data capture arrives as null and is shown as '-'. */
function displayAverage(periodAverage) {
  return periodAverage === null || periodAverage === undefined
    ? NOT_APPLICABLE
    : Math.round(periodAverage)
}

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
