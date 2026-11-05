/**
 * Pieces shared by the DAQI and Last 7 days summaries, both of which map
 * aqie-back-end's GET /monitoringStationHistory response onto table rows.
 */

const NOT_APPLICABLE = '-'
const MS_PER_HOUR = 60 * 60 * 1000

/** aqie-back-end's pollutant keys to the display names the tables use. */
const POLLUTANT_DISPLAY_NAMES = {
  PM25: 'PM2.5',
  PM10: 'PM10',
  NO2: 'Nitrogen dioxide',
  O3: 'Ozone',
  SO2: 'Sulphur dioxide'
}

/**
 * Final display rounding. A value withheld by aqie-back-end (for example for
 * low data capture) arrives as null and is shown as '-'.
 */
function displayAverage(value) {
  return value === null || value === undefined
    ? NOT_APPLICABLE
    : Math.round(value)
}

/**
 * aqie-back-end stamps each hour with the time it ends, so the hour that ends
 * at a stamp began an hour earlier. That is the moment to format when the
 * stamp is shown as a date, otherwise an hour ending at 00:00 shows the next
 * day.
 */
function startOfHourEndingAt(stamp) {
  return stamp ? new Date(Date.parse(stamp) - MS_PER_HOUR).toISOString() : stamp
}

export {
  NOT_APPLICABLE,
  POLLUTANT_DISPLAY_NAMES,
  displayAverage,
  startOfHourEndingAt
}
