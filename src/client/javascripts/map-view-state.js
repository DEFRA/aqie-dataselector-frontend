/**
 * Saves the map view (position, zoom, filters, selected station) when the user
 * leaves for a station page, and restores it once when they come back.
 * Kept in sessionStorage, never in the URL, so nothing is exposed in links.
 */

const STORAGE_KEY = 'aqie-map-view-state'

const MS_PER_MINUTE = 60_000

// A saved view older than this is ignored, so a stale entry can't affect a later visit.
const MAX_AGE_MINUTES = 30
const MAX_AGE_MS = MAX_AGE_MINUTES * MS_PER_MINUTE

const MIN_ZOOM = 0
const MAX_ZOOM = 24
const MAX_LATITUDE = 90
const MAX_LONGITUDE = 180
const MAX_STATION_ID_LENGTH = 100

const FILTER_MODES = new Set(['daqi', 'other'])
const MAP_MODES = new Set(['aurn', 'forecast'])
const POLLUTANT_CODES = new Set(['NO2', 'O3', 'SO2', 'PM25', 'PM10'])
const FORECAST_DAYS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
const STATION_ID_PREFIX = 'ms-'

/**
 * @typedef {object} MapViewState
 * @property {number} [zoom]
 * @property {[number, number]} [center] - [lng, lat]
 * @property {{ mode?: string, mapMode?: string, selected?: string[] }} [filters]
 * @property {string} [forecastDay]
 * @property {string} [selectedStationId]
 */

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function sanitiseZoom(zoom) {
  const valid = isFiniteNumber(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM
  return valid ? zoom : undefined
}

function sanitiseCenter(center) {
  if (!Array.isArray(center) || center.length !== 2) {
    return undefined
  }
  const [lng, lat] = center
  const valid =
    isFiniteNumber(lng) &&
    isFiniteNumber(lat) &&
    Math.abs(lng) <= MAX_LONGITUDE &&
    Math.abs(lat) <= MAX_LATITUDE
  return valid ? [lng, lat] : undefined
}

function sanitiseFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return undefined
  }
  const clean = {}
  if (FILTER_MODES.has(filters.mode)) {
    clean.mode = filters.mode
  }
  if (MAP_MODES.has(filters.mapMode)) {
    clean.mapMode = filters.mapMode
  }
  if (Array.isArray(filters.selected)) {
    clean.selected = filters.selected.filter((code) =>
      POLLUTANT_CODES.has(code)
    )
  }
  return Object.keys(clean).length > 0 ? clean : undefined
}

function sanitiseStationId(id) {
  const valid =
    typeof id === 'string' &&
    id.startsWith(STATION_ID_PREFIX) &&
    id.length <= MAX_STATION_ID_LENGTH
  return valid ? id : undefined
}

/**
 * Keeps only the fields that are well-formed and in range. Storage content is
 * untrusted, so every field is validated independently.
 * @param {unknown} raw
 * @returns {MapViewState | null}
 */
function sanitiseState(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const clean = {}
  const zoom = sanitiseZoom(raw.zoom)
  if (zoom !== undefined) {
    clean.zoom = zoom
  }
  const center = sanitiseCenter(raw.center)
  if (center) {
    clean.center = center
  }
  const filters = sanitiseFilters(raw.filters)
  if (filters) {
    clean.filters = filters
  }
  if (FORECAST_DAYS.has(raw.forecastDay)) {
    clean.forecastDay = raw.forecastDay
  }
  const selectedStationId = sanitiseStationId(raw.selectedStationId)
  if (selectedStationId) {
    clean.selectedStationId = selectedStationId
  }
  return Object.keys(clean).length > 0 ? clean : null
}

/**
 * Stores the current map view so it can be restored when the user returns.
 * Storage failures (blocked, full) are ignored: the map then opens at the default view.
 * @param {MapViewState} state
 */
function saveMapViewState(state) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), state })
    )
  } catch {
    // Restoring the view is a convenience, so a storage failure is not an error
  }
}

/**
 * Returns the saved map view, if there is a valid one, and removes it so it is
 * only restored once - a later unrelated visit to the map starts at the default view.
 * @returns {MapViewState | null}
 */
function restoreMapViewState() {
  let stored
  try {
    stored = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!stored) {
    return null
  }
  try {
    const { savedAt, state } = JSON.parse(stored)
    if (!isFiniteNumber(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      return null
    }
    return sanitiseState(state)
  } catch {
    return null
  }
}

/**
 * Returns the map view for the dataselector's "View map of nearby monitoring
 * stations" link (centred on the station, station selected), or null when the
 * page wasn't opened that way. The server renders it into the map element's
 * data-nearby-stations-view; it is sanitised like a saved view. Resets the
 * address bar to /map so a refresh is a plain GET rather than a re-POST.
 * @returns {MapViewState | null}
 */
function readNearbyStationsView() {
  const raw = document.getElementById('map')?.dataset.nearbyStationsView
  if (!raw) {
    return null
  }
  window.history.replaceState(null, '', '/map')
  try {
    return sanitiseState(JSON.parse(raw))
  } catch {
    return null
  }
}

export { saveMapViewState, restoreMapViewState, readNearbyStationsView }
