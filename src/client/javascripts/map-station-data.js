import { toSafeDaqiIndex } from './map-daqi.js'

// Maximum distance (degrees) between a station and a forecast point to be considered a match.
const FORECAST_MATCH_RADIUS_DEG = 0.05

/**
 * Returns the marker id for a station.
 * @param {{ localSiteID: string }} station
 * @returns {string}
 */
function stationMarkerId(station) {
  return `ms-${station.localSiteID}`
}

/**
 * Converts API coordinates [lat, lng] to the [lng, lat] order the map expects.
 * @param {{ location: { coordinates: [number, number] } }} station
 * @returns {[number, number]}
 */
function stationMapCoords(station) {
  const coords = station.location.coordinates
  return [Number.parseFloat(coords[1]), Number.parseFloat(coords[0])]
}

/**
 * Returns true only when a station has a plottable coordinate pair.
 * Stations missing location data or with non-finite values are skipped.
 * @param {{ location?: { coordinates?: unknown } }} station
 * @returns {boolean}
 */
function hasValidCoords(station) {
  const coords = station.location?.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false
  }
  if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
    return false
  }
  return true
}

/**
 * Returns today's DAQI value from a forecast entry.
 *
 * The forecast array contains values for each day of the week (e.g. Mon–Fri).
 * Rather than assuming index 0 is always today — which breaks if the nightly
 * refresh cron job hasn't run yet and the stored data is from the previous day
 * — we match by the current day abbreviation instead.
 *
 * Falls back to index 0 if no matching day entry is found.
 * @param {{ forecast: Array<{ day: string, value: number }> }} forecastEntry
 * @param {string} dayAbbr - Three-letter day abbreviation e.g. 'Mon'
 * @returns {number}
 */
function daqiValueForDay(forecastEntry, dayAbbr) {
  const entry =
    forecastEntry.forecast.find((f) => f.day === dayAbbr) ??
    forecastEntry.forecast[0]
  return entry.value
}

/**
 * Finds the forecast entry whose location is nearest to the station, within 0.05 degrees.
 * @param {Array<object>} forecasts
 * @param {{ location: { coordinates: [number, number] } }} station
 * @returns {object|null}
 */
function forecastForStation(forecasts, station) {
  if (!station.location) {
    return null
  }
  const sLat = Number.parseFloat(station.location.coordinates[0])
  const sLng = Number.parseFloat(station.location.coordinates[1])
  let best = null
  let bestDist = FORECAST_MATCH_RADIUS_DEG * FORECAST_MATCH_RADIUS_DEG
  forecasts.forEach((entry) => {
    if (!entry.location?.coordinates) {
      return
    }
    const fLat = Number.parseFloat(entry.location.coordinates[0])
    const fLng = Number.parseFloat(entry.location.coordinates[1])
    const dist = (fLat - sLat) ** 2 + (fLng - sLng) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = entry
    }
  })
  return best
}

/**
 * Returns today's DAQI value (1–10) for a station, or null if unavailable.
 * In AURN mode, returns the observed DAQI from the aurnDataByStation map.
 * In forecast mode, returns the forecast DAQI for the selected day.
 * Closed stations always return null.
 * @param {object} params
 * @param {{ stationStatus?: string, status?: string, siteStatus?: string, localSiteID?: string }} params.station
 * @param {string} params.mapMode
 * @param {Map<string, number>} params.aurnDataByStation
 * @param {Array<object>} params.forecasts
 * @param {string} params.selectedForecastDay
 * @returns {number|null}
 */
function stationDaqi({
  station,
  mapMode,
  aurnDataByStation,
  forecasts,
  selectedForecastDay
}) {
  const status = (
    station.stationStatus ||
    station.status ||
    station.siteStatus ||
    ''
  ).toLowerCase()
  if (status === 'closed') {
    return null
  }
  if (mapMode === 'aurn') {
    return toSafeDaqiIndex(aurnDataByStation.get(station.localSiteID))
  }
  const forecast = forecastForStation(forecasts, station)
  if (
    forecast &&
    Array.isArray(forecast.forecast) &&
    forecast.forecast.length > 0
  ) {
    return toSafeDaqiIndex(daqiValueForDay(forecast, selectedForecastDay))
  }
  return null
}

/**
 * Fetches and returns monitoring stations sorted north-to-south.
 * Returns an empty array if the request fails.
 * @returns {Promise<Array<object>>}
 */
async function loadMonitoringStations() {
  try {
    const response = await fetch('/api/monitoring-stations')
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return (data.stations ?? []).sort((stationA, stationB) => {
      const latA = Number.parseFloat(stationA.location?.coordinates?.[0]) || 0
      const latB = Number.parseFloat(stationB.location?.coordinates?.[0]) || 0
      return latB - latA
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load monitoring stations', err)
    return []
  }
}

/**
 * Fetches and returns the forecast data array.
 * Returns an empty array if the request fails.
 * @returns {Promise<Array<object>>}
 */
async function loadForecasts() {
  try {
    const response = await fetch('/api/forecasts')
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return Array.isArray(data) ? data : (data.forecasts ?? [])
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load forecasts', err)
    return []
  }
}

/**
 * Fetches and returns the AURN observed DAQI index keyed by localSiteID.
 * Returns an empty Map if the request fails.
 * @returns {Promise<Map<string, number>>}
 */
async function loadAurnData() {
  const aurnDataByStation = new Map()
  try {
    const response = await fetch('/api/aurn-data')
    if (response.ok) {
      const data = await response.json()
      for (const m of data.measurements ?? []) {
        aurnDataByStation.set(m.localSiteID, m.daqiIndex)
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load AURN data', err)
  }
  return aurnDataByStation
}

export {
  stationMarkerId,
  stationMapCoords,
  hasValidCoords,
  daqiValueForDay,
  forecastForStation,
  stationDaqi,
  loadMonitoringStations,
  loadForecasts,
  loadAurnData
}
