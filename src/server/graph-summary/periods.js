import {
  ONE_DAY_MS,
  DAYS_IN_SEVEN_DAYS
} from '~/src/server/common/constants/magic-numbers.js'

const PERIODS = [
  { key: 'last24hours', days: 1 },
  { key: 'last7days', days: DAYS_IN_SEVEN_DAYS }
]

const PERIOD_KEYS = PERIODS.map(({ key }) => key)
const DEFAULT_PERIOD = PERIOD_KEYS[0]

// UTC, like the readings and the rest of the station pages.
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Formats the calendar days a period covers, ending today: a single date for
 * the last 24 hours, "<first day> to <today>" for longer periods. An unknown
 * period is treated as the default one.
 * @param {string} period
 * @param {Date} [now]
 * @returns {string}
 */
function formatPeriodDates(period, now = new Date()) {
  const { days } = PERIODS.find(({ key }) => key === period) ?? PERIODS[0]
  const end = startOfUtcDay(now)
  const start = end - (days - 1) * ONE_DAY_MS

  return start === end
    ? dateFormat.format(end)
    : `${dateFormat.format(start)} to ${dateFormat.format(end)}`
}

export { PERIOD_KEYS, DEFAULT_PERIOD, formatPeriodDates }
