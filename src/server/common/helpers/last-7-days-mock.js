/**
 * TEMPORARY mock data for the "Last 7 days" tab, standing in for a real
 * fetch from aqie-back-end's GET /monitoringStationHistory while its
 * Ricardo API dependency is unreachable - see
 * LAST_7_DAYS_FROM_AQIE_BACKEND_PLAN.md. Delete this file once
 * fetchLast7DaysSummary (real data) replaces it in stationdetails/controller.js.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 7

// '-' matches the existing "not applicable" convention already used for
// annualcount in yearlytable.njk. Daily exceedances use the designer's
// literal 'no legal limit' text instead, for pollutants with no daily limit.
const NOT_APPLICABLE = '-'
const NO_DAILY_LIMIT = 'no legal limit'

/** Fixture values per pollutant, loosely based on the version-17 prototype. */
const MOCK_VALUES = {
  'PM2.5': {
    dataCapturePercentage: 100,
    average: 8,
    dailyCount: NO_DAILY_LIMIT,
    hourlyCount: NOT_APPLICABLE
  },
  PM10: {
    dataCapturePercentage: 100,
    average: 14,
    dailyCount: 2,
    hourlyCount: NOT_APPLICABLE
  },
  'Nitrogen dioxide': {
    dataCapturePercentage: 100,
    average: 52,
    dailyCount: NO_DAILY_LIMIT,
    hourlyCount: 1
  },
  Ozone: {
    dataCapturePercentage: 100,
    average: 32,
    dailyCount: NO_DAILY_LIMIT,
    hourlyCount: NOT_APPLICABLE
  },
  'Sulphur dioxide': {
    dataCapturePercentage: 100,
    average: 6,
    dailyCount: 0,
    hourlyCount: 0
  }
}

/**
 * Builds a mock 7-day summary for whichever pollutants the station actually
 * monitors, in the same shape a real fetchLast7DaysSummary will eventually
 * return, so last7daystable.njk doesn't need to change when mock data is
 * replaced with real data.
 * @param {string[]} pollutants display names, e.g. station.pollutants
 * @returns {{periodStart: string, periodEnd: string, latestReadingAt: string, pollutants: object[]}}
 */
function buildMockLast7DaysSummary(pollutants = []) {
  const now = new Date()
  // Per designer guidance: the date stamp runs from (today - 6 days) to
  // today, i.e. 7 days inclusive of today. NOTE: once this is wired up to a
  // real feed, aqie-back-end's data won't include today's reading yet (see
  // LAST_7_DAYS_FROM_AQIE_BACKEND_PLAN.md), so periodEnd will likely need to
  // become yesterday at that point - flagging now so it isn't missed later.
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const periodStart = new Date(
    periodEnd.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY
  )

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    latestReadingAt: now.toISOString(),
    pollutants: pollutants
      .filter((name) => MOCK_VALUES[name])
      .map((name) => ({ pollutantName: name, ...MOCK_VALUES[name] }))
  }
}

export { buildMockLast7DaysSummary }
