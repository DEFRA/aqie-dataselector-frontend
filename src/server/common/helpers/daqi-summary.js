/**
 * Maps aqie-back-end's GET /monitoringStationHistory `summary` block onto the
 * per-pollutant rows daqitable.njk renders.
 *
 * Concentration means and DAQI indices (1-10) are calculated by aqie-back-end.
 * Display rounding of the average happens here at the last step.
 */

import {
  NOT_APPLICABLE,
  POLLUTANT_DISPLAY_NAMES,
  displayAverage,
  startOfHourEndingAt
} from '~/src/server/common/helpers/history-summary-shared.js'

/** Averaging period copy per pollutant display name, per acceptance criteria. */
const POLLUTANT_AVERAGING_PERIODS = {
  'PM2.5': '24 hour average',
  PM10: '24 hour average',
  'Nitrogen dioxide': 'Hourly average',
  Ozone: '8 hour rolling average',
  'Sulphur dioxide': '15 minute concentrations'
}

/** Band labels indexed by DAQI level (1-10); index 0 is unused. */
const DAQI_BAND_BY_INDEX = [
  null,
  'low',
  'low',
  'low',
  'moderate',
  'moderate',
  'moderate',
  'high',
  'high',
  'high',
  'very high'
]

function daqiBandLabel(index) {
  const level = Number(index)
  if (!Number.isInteger(level)) {
    return null
  }
  return DAQI_BAND_BY_INDEX[level] ?? null
}

function toDaqiRow(code, summary) {
  const pollutantName = POLLUTANT_DISPLAY_NAMES[code] ?? code
  const daqi = summary?.daqi ?? null
  const daqiIndex = daqi?.index ?? null

  return {
    pollutantName,
    average: displayAverage(daqi?.concentration),
    daqiIndex,
    daqiBand: daqiBandLabel(daqiIndex),
    averagingPeriod:
      POLLUTANT_AVERAGING_PERIODS[pollutantName] ??
      daqi?.averagingPeriod ??
      NOT_APPLICABLE
  }
}

/**
 * @param {{ to?: string|null, summary?: { measuredAt?: string|null, pollutants?: Record<string, {
 *   daqi?: { concentration: number, index: number|null, measuredAt: string, averagingPeriod: string } | null
 * }> } }} history aqie-back-end's /monitoringStationHistory response.
 * @param {string[]} stationPollutants display names the station actually
 *   monitors (station.pollutants).
 * @returns {{ measuredAt: string|null, periodDate: string|null, latestReadingAt: string|null, pollutants: object[] }}
 *   `periodDate` is the start of the hour `measuredAt` ends, i.e. the day the
 *   page should label.
 */
function summariseDaqiHistory(history, stationPollutants = []) {
  const rowsByDisplayName = new Map(
    Object.entries(history?.summary?.pollutants ?? {}).map(
      ([code, summary]) => [
        POLLUTANT_DISPLAY_NAMES[code] ?? code,
        toDaqiRow(code, summary)
      ]
    )
  )

  const measuredAt = history?.summary?.measuredAt ?? history?.to ?? null
  const latestReadingAt = history?.to ?? history?.summary?.measuredAt ?? null

  return {
    measuredAt,
    periodDate: startOfHourEndingAt(measuredAt),
    latestReadingAt,
    pollutants: stationPollutants
      .filter((name) => rowsByDisplayName.has(name))
      .map((name) => rowsByDisplayName.get(name))
  }
}

export { summariseDaqiHistory }
