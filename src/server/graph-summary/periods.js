import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'

// A range period shows "<first day> to <last day>"; the others a single date.
const PERIODS = [
  {
    key: 'last24hours',
    historyPeriod: HISTORY_PERIOD.LAST_24_HOURS,
    isRange: false
  },
  {
    key: 'last7days',
    historyPeriod: HISTORY_PERIOD.LAST_7_DAYS,
    isRange: true
  }
]

const PERIOD_KEYS = PERIODS.map(({ key }) => key)
const DEFAULT_PERIOD = PERIOD_KEYS[0]

// UTC, like the readings and the rest of the station pages.
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long'
})
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

function toDate(stamp) {
  if (!stamp) {
    return null
  }
  const date = new Date(stamp)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The aqie-back-end history period that backs a page period.
 * @param {string} period
 * @returns {string|undefined}
 */
function historyPeriodFor(period) {
  return PERIODS.find(({ key }) => key === period)?.historyPeriod
}

/**
 * Formats the calendar days the readings cover: a single date for the last 24
 * hours (the day of the latest reading), "<first day> to <last day> <year>" for
 * longer periods, as on the parent station page's tabs. The window comes from
 * aqie-back-end, so the dates match the data rather than the clock.
 * @param {string} period
 * @param {{ periodStart?: string, periodEnd?: string }} [window] as returned by
 *   resolveStationHistory
 * @returns {string} empty when the window is not known
 */
function formatPeriodDates(period, { periodStart, periodEnd } = {}) {
  const definition = PERIODS.find(({ key }) => key === period)
  const start = toDate(periodStart)
  const end = toDate(periodEnd)
  if (!definition || !end || (definition.isRange && !start)) {
    return ''
  }

  return definition.isRange
    ? `${dayMonthFormat.format(start)} to ${dateFormat.format(end)}`
    : dateFormat.format(end)
}

export { PERIOD_KEYS, DEFAULT_PERIOD, historyPeriodFor, formatPeriodDates }
