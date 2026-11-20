import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'

// The last 7 days shows no dates without the window's first day, as its last
// day alone would not describe it. The last 24 hours falls back to the day of
// the latest reading.
const PERIODS = [
  {
    key: 'last24hours',
    historyPeriod: HISTORY_PERIOD.LAST_24_HOURS,
    needsStart: false
  },
  {
    key: 'last7days',
    historyPeriod: HISTORY_PERIOD.LAST_7_DAYS,
    needsStart: true
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
 * Formats the calendar days the readings cover, as on the parent station page's
 * tabs: "<first day> to <last day> <year>", or a single date when the window is
 * within one day. Both periods end at the latest hour with a reading, so the
 * last 24 hours is a single date only when that hour ends at midnight. The
 * window comes from aqie-back-end, so the dates match the data rather than the
 * clock.
 * @param {string} period
 * @param {{ periodStart?: string, periodEnd?: string }} [window] as returned by
 *   resolveStationHistory
 * @returns {string} empty when the window is not known
 */
function formatPeriodDates(period, { periodStart, periodEnd } = {}) {
  const definition = PERIODS.find(({ key }) => key === period)
  const start = toDate(periodStart)
  const end = toDate(periodEnd)
  if (!definition || !end || (definition.needsStart && !start)) {
    return ''
  }

  const lastDay = dateFormat.format(end)
  return start && dateFormat.format(start) !== lastDay
    ? `${dayMonthFormat.format(start)} to ${lastDay}`
    : lastDay
}

export { PERIOD_KEYS, DEFAULT_PERIOD, historyPeriodFor, formatPeriodDates }
