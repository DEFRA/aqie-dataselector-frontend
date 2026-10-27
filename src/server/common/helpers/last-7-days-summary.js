/**
 * Turns aqie-back-end's GET /monitoringStationHistory response (raw hourly
 * readings per pollutant) into the per-pollutant stats last7daystable.njk
 * expects - the same shape buildMockLast7DaysSummary produced, so swapping
 * mock data for this was a controller-only change. See
 * LAST_7_DAYS_FROM_AQIE_BACKEND_PLAN.md section 3 (F2).
 *
 * Legal-limit thresholds here are deliberately duplicated from
 * pollutant-toggletips.js rather than shared - see that plan's section 5 for
 * why.
 */

const HOURS_PER_WEEK = 168
const MIN_VALID_HOURS_PER_DAY = 18
const PERCENTAGE_SCALE = 100

const NOT_APPLICABLE = '-'
const NO_LEGAL_LIMIT = 'no legal limit'

const HOURLY_LIMITS = { NO2: 200, SO2: 350 }
const DAILY_LIMITS = { PM10: 50, SO2: 125 }

/** aqie-back-end's pollutant keys to the display names last7daystable.njk uses. */
const POLLUTANT_DISPLAY_NAMES = {
  PM25: 'PM2.5',
  PM10: 'PM10',
  NO2: 'Nitrogen dioxide',
  O3: 'Ozone',
  SO2: 'Sulphur dioxide'
}

function average(values) {
  if (values.length === 0) {
    return NOT_APPLICABLE
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(mean)
}

function dataCapturePercentage(validCount) {
  return Math.round((validCount / HOURS_PER_WEEK) * PERCENTAGE_SCALE)
}

function hourlyExceedanceCount(code, values) {
  const limit = HOURLY_LIMITS[code]
  if (limit === undefined) {
    return NO_LEGAL_LIMIT
  }
  return values.filter((value) => value > limit).length
}

/** UTC calendar date (YYYY-MM-DD) the reading's end time falls in. */
function dayKey(time) {
  return new Date(time).toISOString().slice(0, 10)
}

function dailyExceedanceCount(code, readings) {
  const limit = DAILY_LIMITS[code]
  if (limit === undefined) {
    return NO_LEGAL_LIMIT
  }

  const byDay = new Map()
  readings
    .filter((reading) => reading.value !== null)
    .forEach((reading) => {
      const key = dayKey(reading.time)
      byDay.set(key, [...(byDay.get(key) ?? []), reading.value])
    })

  let exceedances = 0
  byDay.forEach((values) => {
    if (values.length < MIN_VALID_HOURS_PER_DAY) {
      return
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    if (mean > limit) {
      exceedances++
    }
  })
  return exceedances
}

function summarisePollutant(code, readings = []) {
  const validValues = readings
    .map((reading) => reading.value)
    .filter((value) => value !== null)

  return {
    pollutantName: POLLUTANT_DISPLAY_NAMES[code] ?? code,
    dataCapturePercentage: dataCapturePercentage(validValues.length),
    average: average(validValues),
    dailyCount: dailyExceedanceCount(code, readings),
    hourlyCount: hourlyExceedanceCount(code, validValues)
  }
}

/**
 * @param {{ from: string, to: string, pollutants: Record<string, Array<{time: string, value: number|null}>> }} history
 *   aqie-back-end's /monitoringStationHistory response
 * @param {string[]} stationPollutants display names the station actually
 *   monitors (station.pollutants) - the response always includes all five
 *   codes regardless, with nulls for ones the station doesn't measure, so
 *   this filters (and orders) the output to match the rest of the page.
 * @returns {{periodStart: string, periodEnd: string, latestReadingAt: string, pollutants: object[]}}
 */
function summariseStationHistory(history, stationPollutants = []) {
  const byDisplayName = new Map(
    Object.entries(history.pollutants ?? {}).map(([code, readings]) => [
      POLLUTANT_DISPLAY_NAMES[code] ?? code,
      summarisePollutant(code, readings)
    ])
  )

  return {
    periodStart: history.from,
    periodEnd: history.to,
    latestReadingAt: history.to,
    pollutants: stationPollutants
      .filter((name) => byDisplayName.has(name))
      .map((name) => byDisplayName.get(name))
  }
}

export { summariseStationHistory }
