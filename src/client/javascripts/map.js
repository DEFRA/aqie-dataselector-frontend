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
 * Builds the map, loads the station data and wires up the map UI.
 * Runs once when the page loads; exported so the tests can wait for it.
 * @returns {Promise<void>}
 */
async function initMap() {
  let maplibreInstance = null

  // Arriving from "View map of nearby monitoring stations" wins over the view
  // saved before leaving for a station page; the saved one is consumed either way.
  const savedView = restoreMapViewState()
  const restoredView = readNearbyStationsView() ?? savedView

  const map = new defra.InteractiveMap('map', {
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

  // Before the data loads, so the panels respond straight away
  initMapPanels({ closeStationPanel: () => closeStationPanel() })
  document.getElementById('exit-map')?.addEventListener('click', () => {
    // Opened directly (bookmark, shared link): there's no page to go back to
    if (document.referrer.startsWith(globalThis.location.origin)) {
      history.back()
    } else {
      globalThis.location.assign('/')
    }
  })
  map.on('map:ready', ({ map: maplibreMap }) => {
    maplibreInstance = maplibreMap
    initZoomControls(maplibreMap)
  })

  // Registered before the data loads, as the map can finish rendering first
  const loadState = { mapRendered: false, dataLoaded: false }
  map.on('map:firstidle', () => {
    loadState.mapRendered = true
    initMapFeatures()
  })

  const sortedStationsByLat = await loadMonitoringStations()
  const forecasts = await loadForecasts()
  const aurnDataByStation = await loadAurnData()

  /** The currently selected forecast day abbreviation (e.g. 'Mon'). Defaults to today. */
  let selectedForecastDay = DAY_ABBR[new Date().getDay()]
  const restoredForecastDay = forecasts[0]?.forecast?.find(
    (f) => f.day === restoredView?.forecastDay
  )?.day
  if (restoredForecastDay) {
    selectedForecastDay = restoredForecastDay
  }

  /**
   * Returns the current DAQI lookup context (mode, observed data, forecasts, selected day).
   * @returns {{ mapMode: string, aurnDataByStation: Map<string, number>, forecasts: Array<object>, selectedForecastDay: string }}
   */
  function getDaqiContext() {
    return {
      mapMode: filterState.mapMode,
      aurnDataByStation,
      forecasts,
      selectedForecastDay
    }
  }

  const { closeStationPanel, highlightStation, panelState } =
    createStationPanelController({
      map,
      getSortedStations: () => sortedStationsByLat,
      getDaqiContext
    })

  const {
    initMarkerObserver,
    initMapMouseInteraction,
    initStationPanelKeyboard
  } = createMarkerAccessibility({
    getSortedStations: () => sortedStationsByLat,
    onActivateStation: highlightStation,
    closeStationPanel
  })

  /**
   * (Re)plots all markers that pass the current filter, removing any that no longer match.
   * Sorted north-to-south, then lowest-DAQI first within each latitude so that the
   * highest-DAQI marker is added last and renders on top.
   */
  function plotAllMarkers() {
    const daqiContext = getDaqiContext()
    const sortByLatThenDaqi = [...sortedStationsByLat].sort((a, b) => {
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
      if (id === panelState.selectedMarkerId) {
        return
      }
      if (stationMatchesFilter(station)) {
        map.addMarker(
          id,
          stationMapCoords(station),
          daqiMarkerOptions(stationDaqi({ station, ...daqiContext }), false)
        )
      } else {
        map.removeMarker(id)
      }
    })
  }

  /**
   * Populates the forecast day selector buttons from the loaded forecasts data.
   * The button matching today's day abbreviation is activated by default.
   * Selecting a day updates selectedForecastDay and re-plots all markers.
   * @param {Function} onDayChange - called to re-plot markers when the day changes
   */
  function initForecastDayControls(onDayChange) {
    const dayGroup = document.getElementById('forecast-day-group')
    if (!dayGroup || forecasts.length === 0) {
      return
    }
    const days = forecasts[0]?.forecast?.map((f) => f.day) ?? []
    days.forEach((day) => {
      const btn = document.createElement('button')
      const isActive = day === selectedForecastDay
      btn.className =
        'aq-filter-panel__tab' + (isActive ? ` ${TAB_ACTIVE_CLASS}` : '')
      btn.setAttribute(ARIA_PRESSED, String(isActive))
      btn.dataset.day = day
      btn.innerHTML = `<span>${day}</span>`
      btn.addEventListener('click', () => {
        dayGroup.querySelectorAll('button').forEach((b) => {
          b.setAttribute(ARIA_PRESSED, 'false')
          b.classList.remove(TAB_ACTIVE_CLASS)
        })
        btn.setAttribute(ARIA_PRESSED, 'true')
        btn.classList.add(TAB_ACTIVE_CLASS)
        selectedForecastDay = day
        onDayChange()
      })
      dayGroup.appendChild(btn)
    })
  }

  /** Plots the markers and wires up the map UI once the map and the data are ready. */
  function initMapFeatures() {
    if (!loadState.mapRendered || !loadState.dataLoaded) {
      return
    }
    initStationPanelKeyboard()
    initMarkerObserver()
    initMapMouseInteraction()
    applyFilterState(restoredView?.filters)
    plotAllMarkers()
    initFilterPanel(plotAllMarkers)
    initForecastDayControls(plotAllMarkers)
    reselectRestoredStation()
  }

  /** Reopens the station that was selected before the user left for its station page. */
  function reselectRestoredStation() {
    const id = restoredView?.selectedStationId
    const station = id
      ? sortedStationsByLat.find(
          (s) => hasValidCoords(s) && stationMarkerId(s) === id
        )
      : null
    if (station && stationMatchesFilter(station)) {
      highlightStation(station)
    }
  }

  /** Saves the current view so it can be restored when the user returns from the station page. */
  function saveCurrentView() {
    const state = {
      filters: {
        mode: filterState.mode,
        mapMode: filterState.mapMode,
        selected: [...filterState.selected]
      },
      forecastDay: selectedForecastDay,
      selectedStationId: panelState.selectedMarkerId ?? undefined
    }
    if (maplibreInstance) {
      const { lng, lat } = maplibreInstance.getCenter()
      state.zoom = maplibreInstance.getZoom()
      state.center = [lng, lat]
    }
    saveMapViewState(state)
  }

  loadState.dataLoaded = true
  initMapFeatures()

  /**
   * Squared distance between a click and a station, in screen pixels when the map is
   * available (so the target is the same size at every zoom), otherwise in degrees.
   * @returns {{ squaredDist: number, maxSquaredDist: number }}
   */
  function clickDistance(station, evt) {
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

  // On map click (canvas), select the nearest plotted station within a marker-sized distance.
  // Note: clicking directly on a station marker (DOM overlay) does not fire map:click —
  // that case is handled by the keyboard/marker listeners in map-marker-accessibility.js.
  map.on('map:click', (evt) => {
    if (!evt?.coords) {
      return
    }
    let best = null
    let bestDist = Infinity
    let bestMax = 0
    sortedStationsByLat.forEach((station) => {
      if (
        !hasValidCoords(station) ||
        !isActiveStation(station) ||
        !stationMatchesFilter(station)
      ) {
        return
      }
      const { squaredDist, maxSquaredDist } = clickDistance(station, evt)
      if (squaredDist < bestDist) {
        bestDist = squaredDist
        bestMax = maxSquaredDist
        best = station
      }
    })
    if (best && bestDist < bestMax) {
      highlightStation(best)
    }
  })

  /**
   * Navigates the map to a station: highlights it and shows the station panel.
   * Exposed on window so station-list.js can trigger map navigation.
   * @param {object} station
   */
  globalThis.navigateToStation = function (station) {
    highlightStation(station)
  }

  document
    .getElementById('sp-close')
    ?.addEventListener('click', closeStationPanel)

  // The visible trigger is a link (not a button) to match existing styling,
  // but it submits the hidden form rather than navigating via href.
  document
    .getElementById('sp-station-link')
    ?.addEventListener('click', (event) => {
      event.preventDefault()
      saveCurrentView()
      document.getElementById('sp-station-form')?.submit()
    })
}

const ready = initMap()

export { initMap, ready }
