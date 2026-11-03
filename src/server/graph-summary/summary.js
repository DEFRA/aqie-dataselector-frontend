import { english } from '~/src/server/data/en/homecontent.js'

/**
 * View model for the "View pollutant summary" section: the rows of the shared
 * summary table, or the message that takes their place.
 * @param {object} history as returned by resolveStationHistory
 * @param {string} historyPeriod the aqie-back-end period the rows are for
 * @returns {{ title: string, period: string, rows: object[], message: string|null, legalLimits: string }}
 */
function buildPollutantSummary(history, historyPeriod) {
  const { summary, legalLimits } = english.graphsummary
  const rows = history.pollutants ?? []

  let message = null
  if (rows.length === 0) {
    message = history.noMapping ? summary.noMapping : summary.noData
  }

  return {
    title: summary.title,
    period: historyPeriod,
    rows,
    message,
    legalLimits
  }
}

export { buildPollutantSummary }
