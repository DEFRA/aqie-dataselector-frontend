/* global defra, history */

import {
  stationMarkerId,
  stationMapCoords,
  hasValidCoords,
  stationDaqi,
  loadMonitoringStations,
  loadForecasts,
  loadAurnData
} from './map-station-data.js'
import { daqiMarkerOptions } from './map-daqi.js'
import {
  stationMatchesFilter,
  isActiveStation,
  initFilterPanel,
  applyFilterState,
  filterState
} from './map-filter-panel.js'
import { createMarkerAccessibility } from './map-marker-accessibility.js'
import { initMapPanels } from './map-panels.js'
import { createStationPanelController } from './map-station-panel.js'
import { initZoomControls } from './map-zoom-controls.js'
import {
  readNearbyStationsView,
  restoreMapViewState,
  saveMapViewState
} from './map-view-state.js'

const defaultZoom = 5.4842222
const ukCentreLng = -1.4649
const ukCentreLat = 52.5619

const ARIA_PRESSED = 'aria-pressed'
const TAB_ACTIVE_CLASS = 'aq-filter-panel__tab--active'

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Fallback when the map isn't ready: max squared distance (degrees²) for a click to select a station.
const CLICK_SELECT_MAX_SQUARED_DEG = 0.01

// Max on-screen distance (px) from a marker centre for a click to select it (marker radius is 14px).
const CLICK_SELECT_MAX_PX = 20

/**
 * Creates the interactive map, centred on the restored view if there is one.
 * @param {object|null} restoredView
 * @returns {object} the defra.InteractiveMap instance
 */
function createInteractiveMap(restoredView) {
  return new defra.InteractiveMap('map', {
    mapProvider: defra.maplibreProvider(),
    // 'hybrid' hides the map behind a button on mobile
    behaviour: 'inline',
    // Zoom buttons are on the page, as the built-in ones are hidden on touch
    enableZoomControls: false,
    // Hides the library's "Map controls" move-and-zoom pad
    enableMapControls: false,
    mapLabel: 'United Kingdom',
    zoom: restoredView?.zoom ?? defaultZoom,
    center: restoredView?.center ?? [ukCentreLng, ukCentreLat],
    containerHeight: '100%',
    mapStyle: {
      url: 'https://tiles.openfreemap.org/styles/liberty',
      attribution: 'OpenFreeMap \u00a9 OpenMapTiles Data from OpenStreetMap',
      backgroundColor: '#f5f5f0'
    }
  })
}

/** Wires up the "Exit map" button. */
function initExitMapButton() {
  document.getElementById('exit-map')?.addEventListener('click', () => {
    // Opened directly (bookmark, shared link): there's no page to go back to
    if (document.referrer.startsWith(globalThis.location.origin)) {
      history.back()
    } else {
      globalThis.location.assign('/')
    }
  })
}

/**
 * The forecast day to show first: the restored one if the forecasts still have it, otherwise today.
 * @param {Array<object>} forecasts
 * @param {object|null} restoredView
 * @returns {string} day abbreviation, e.g. 'Mon'
 */
function initialForecastDay(forecasts, restoredView) {
  const restoredForecastDay = forecasts[0]?.forecast?.find(
    (f) => f.day === restoredView?.forecastDay
  )?.day
  return restoredForecastDay ?? DAY_ABBR[new Date().getDay()]
}

/**
 * Returns the current DAQI lookup context (mode, observed data, forecasts, selected day).
 * @param {object} ctx
 * @returns {{ mapMode: string, aurnDataByStation: Map<string, number>, forecasts: Array<object>, selectedForecastDay: string }}
 */
function getDaqiContext(ctx) {
  return {
    mapMode: filterState.mapMode,
    aurnDataByStation: ctx.aurnDataByStation,
    forecasts: ctx.forecasts,
    selectedForecastDay: ctx.selectedForecastDay
  }
}

/**
 * (Re)plots all markers that pass the current filter, removing any that no longer match.
 * Sorted north-to-south, then lowest-DAQI first within each latitude so that the
 * highest-DAQI marker is added last and renders on top.
 * @param {object} ctx
 */
function plotAllMarkers(ctx) {
  const daqiContext = getDaqiContext(ctx)
  const sortByLatThenDaqi = [...ctx.stations].sort((a, b) => {
    const latA = Number.parseFloat(a.location?.coordinates?.[0]) || 0
    const latB = Number.parseFloat(b.location?.coordinates?.[0]) || 0
    if (latA !== latB) {
      return latB - latA
    }
    const daqiA = stationDaqi({ station: a, ...daqiContext }) ?? 0
    const daqiB = stationDaqi({ station: b, ...daqiContext }) ?? 0
    return daqiA - daqiB
  })
  sortByLatThenDaqi.forEach((station) => {
    if (!hasValidCoords(station)) {
      return
    }
    const id = stationMarkerId(station)
    if (id === ctx.panelState.selectedMarkerId) {
      return
    }
    if (stationMatchesFilter(station)) {
      ctx.map.addMarker(
        id,
        stationMapCoords(station),
        daqiMarkerOptions(stationDaqi({ station, ...daqiContext }), false)
      )
    } else {
      ctx.map.removeMarker(id)
    }
  })
}

/**
 * Populates the forecast day selector buttons from the loaded forecasts data.
 * The button matching the selected day is activated by default.
 * Selecting a day updates the selected forecast day and re-plots all markers.
 * @param {object} ctx
 * @param {Function} onDayChange - called to re-plot markers when the day changes
 */
function initForecastDayControls(ctx, onDayChange) {
  const dayGroup = document.getElementById('forecast-day-group')
  if (!dayGroup || ctx.forecasts.length === 0) {
    return
  }
  const days = ctx.forecasts[0]?.forecast?.map((f) => f.day) ?? []
  days.forEach((day) => {
    const btn = document.createElement('button')
    const isActive = day === ctx.selectedForecastDay
    btn.className =
      'aq-filter-panel__tab' + (isActive ? ` ${TAB_ACTIVE_CLASS}` : '')
    btn.setAttribute(ARIA_PRESSED, String(isActive))
    btn.dataset.day = day
    const label = document.createElement('span')
    label.textContent = day
    btn.appendChild(label)
    btn.addEventListener('click', () => {
      dayGroup.querySelectorAll('button').forEach((b) => {
        b.setAttribute(ARIA_PRESSED, 'false')
        b.classList.remove(TAB_ACTIVE_CLASS)
      })
      btn.setAttribute(ARIA_PRESSED, 'true')
      btn.classList.add(TAB_ACTIVE_CLASS)
      ctx.selectedForecastDay = day
      onDayChange()
    })
    dayGroup.appendChild(btn)
  })
}

/**
 * Reopens the station that was selected before the user left for its station page.
 * @param {object} ctx
 */
function reselectRestoredStation(ctx) {
  const id = ctx.restoredView?.selectedStationId
  const station = id
    ? ctx.stations.find((s) => hasValidCoords(s) && stationMarkerId(s) === id)
    : null
  if (station && stationMatchesFilter(station)) {
    ctx.highlightStation(station)
  }
}

/**
 * Plots the markers and wires up the map UI once the map and the data are ready.
 * @param {object} ctx
 */
function initMapFeatures(ctx) {
  if (!ctx.loadState.mapRendered || !ctx.loadState.dataLoaded) {
    return
  }
  const replot = () => plotAllMarkers(ctx)
  ctx.markerAccessibility.initStationPanelKeyboard()
  ctx.markerAccessibility.initMarkerObserver()
  ctx.markerAccessibility.initMapMouseInteraction()
  applyFilterState(ctx.restoredView?.filters)
  replot()
  initFilterPanel(replot)
  initForecastDayControls(ctx, replot)
  reselectRestoredStation(ctx)
}

/**
 * Saves the current view so it can be restored when the user returns from the station page.
 * @param {object} ctx
 */
function saveCurrentView(ctx) {
  const state = {
    filters: {
      mode: filterState.mode,
      mapMode: filterState.mapMode,
      selected: [...filterState.selected]
    },
    forecastDay: ctx.selectedForecastDay,
    selectedStationId: ctx.panelState.selectedMarkerId ?? undefined
  }
  if (ctx.maplibreInstance) {
    const { lng, lat } = ctx.maplibreInstance.getCenter()
    state.zoom = ctx.maplibreInstance.getZoom()
    state.center = [lng, lat]
  }
  saveMapViewState(state)
}

/**
 * Squared distance between a click and a station, in screen pixels when the map is
 * available (so the target is the same size at every zoom), otherwise in degrees.
 * @param {object|null} maplibreInstance
 * @param {object} station
 * @param {object} evt - map:click event
 * @returns {{ squaredDist: number, maxSquaredDist: number }}
 */
function clickDistance(maplibreInstance, station, evt) {
  const lat = Number.parseFloat(station.location.coordinates[0])
  const lng = Number.parseFloat(station.location.coordinates[1])
  if (maplibreInstance && evt.point) {
    const { x, y } = maplibreInstance.project([lng, lat])
    return {
      squaredDist: (x - evt.point.x) ** 2 + (y - evt.point.y) ** 2,
      maxSquaredDist: CLICK_SELECT_MAX_PX ** 2
    }
  }
  const [clickLng, clickLat] = evt.coords
  return {
    squaredDist: (lng - clickLng) ** 2 + (lat - clickLat) ** 2,
    maxSquaredDist: CLICK_SELECT_MAX_SQUARED_DEG
  }
}

/**
 * Finds the nearest plotted active station within a marker-sized distance of a click.
 * @param {object} ctx
 * @param {object} evt - map:click event
 * @returns {object|null}
 */
function findClickedStation(ctx, evt) {
  let best = null
  let bestDist = Infinity
  let bestMax = 0
  ctx.stations.forEach((station) => {
    if (
      !hasValidCoords(station) ||
      !isActiveStation(station) ||
      !stationMatchesFilter(station)
    ) {
      return
    }
    const { squaredDist, maxSquaredDist } = clickDistance(
      ctx.maplibreInstance,
      station,
      evt
    )
    if (squaredDist < bestDist) {
      bestDist = squaredDist
      bestMax = maxSquaredDist
      best = station
    }
  })
  return best && bestDist < bestMax ? best : null
}

/**
 * Wires up station selection (map click, station list) and the station panel's controls.
 * @param {object} ctx
 */
function initStationSelection(ctx) {
  // On map click (canvas), select the nearest plotted station within a marker-sized distance.
  // Note: clicking directly on a station marker (DOM overlay) does not fire map:click —
  // that case is handled by the keyboard/marker listeners in map-marker-accessibility.js.
  ctx.map.on('map:click', (evt) => {
    if (!evt?.coords) {
      return
    }
    const station = findClickedStation(ctx, evt)
    if (station) {
      ctx.highlightStation(station)
    }
  })

  /**
   * Navigates the map to a station: highlights it and shows the station panel.
   * Exposed on window so station-list.js can trigger map navigation.
   * @param {object} station
   */
  globalThis.navigateToStation = function (station) {
    ctx.highlightStation(station)
  }

  document
    .getElementById('sp-close')
    ?.addEventListener('click', ctx.closeStationPanel)

  // The visible trigger is a link (not a button) to match existing styling,
  // but it submits the hidden form rather than navigating via href.
  document
    .getElementById('sp-station-link')
    ?.addEventListener('click', (event) => {
      event.preventDefault()
      saveCurrentView(ctx)
      document.getElementById('sp-station-form')?.submit()
    })
}

/**
 * Builds the map, loads the station data and wires up the map UI.
 * Runs once when the page loads; exported so the tests can wait for it.
 * @returns {Promise<void>}
 */
async function initMap() {
  // Arriving from "View map of nearby monitoring stations" wins over the view
  // saved before leaving for a station page; the saved one is consumed either way.
  const savedView = restoreMapViewState()
  const restoredView = readNearbyStationsView() ?? savedView

  const ctx = {
    map: createInteractiveMap(restoredView),
    restoredView,
    maplibreInstance: null,
    loadState: { mapRendered: false, dataLoaded: false }
  }

  // Before the data loads, so the panels respond straight away
  initMapPanels({ closeStationPanel: () => ctx.closeStationPanel() })
  initExitMapButton()
  ctx.map.on('map:ready', ({ map: maplibreMap }) => {
    ctx.maplibreInstance = maplibreMap
    initZoomControls(maplibreMap)
  })

  // Registered before the data loads, as the map can finish rendering first
  ctx.map.on('map:firstidle', () => {
    ctx.loadState.mapRendered = true
    initMapFeatures(ctx)
  })

  ctx.stations = await loadMonitoringStations()
  ctx.forecasts = await loadForecasts()
  ctx.aurnDataByStation = await loadAurnData()
  ctx.selectedForecastDay = initialForecastDay(ctx.forecasts, restoredView)

  const { closeStationPanel, highlightStation, panelState } =
    createStationPanelController({
      map: ctx.map,
      getSortedStations: () => ctx.stations,
      getDaqiContext: () => getDaqiContext(ctx)
    })
  Object.assign(ctx, { closeStationPanel, highlightStation, panelState })

  ctx.markerAccessibility = createMarkerAccessibility({
    getSortedStations: () => ctx.stations,
    onActivateStation: highlightStation,
    closeStationPanel
  })

  ctx.loadState.dataLoaded = true
  initMapFeatures(ctx)
  initStationSelection(ctx)
}

const ready = initMap()

export { initMap, ready }
