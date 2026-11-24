import {
  stationMapCoords,
  stationMarkerId,
  stationDaqi,
  forecastForStation,
  daqiValueForDay,
  hasValidCoords
} from './map-station-data.js'
import { daqiBand, daqiMarkerOptions, toSafeDaqiIndex } from './map-daqi.js'
import {
  formatDate,
  NOT_AVAILABLE,
  pollutantLabels,
  stationStatusTag
} from './map-utils.js'
import { setStationPanelOpen } from './map-panels.js'

/**
 * Creates an element with the given class and text. Station data only ever
 * goes in as text, never as HTML.
 * @param {string} tagName
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function createElement(tagName, className, text) {
  const element = document.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (text !== undefined) {
    element.textContent = text
  }
  return element
}

/**
 * Builds a DAQI tag span for use in the station panel.
 * @param {number} daqiValue
 * @returns {HTMLElement}
 */
function buildDaqiTag(daqiValue) {
  const band = daqiBand[daqiValue] || ''
  const daqiClass = band
    ? `aq-daqi-tag aq-daqi-tag--${daqiValue}`
    : 'aq-daqi-tag'
  const bandSuffix = band ? ` (${band.toLowerCase()})` : ''

  return createElement('span', daqiClass, `${daqiValue}${bandSuffix}`)
}

/**
 * Builds the DAQI detail row for the station panel, or null if unavailable.
 * @param {object} station
 * @param {object} daqiContext
 * @param {string} daqiContext.mapMode
 * @param {Map<string, number>} daqiContext.aurnDataByStation
 * @param {Array<object>} daqiContext.forecasts
 * @param {string} daqiContext.selectedForecastDay
 * @returns {Array|null}
 */
function buildDaqiRow(station, daqiContext) {
  const { mapMode, aurnDataByStation, forecasts, selectedForecastDay } =
    daqiContext
  if (mapMode === 'aurn') {
    const aurnDaqi = toSafeDaqiIndex(aurnDataByStation.get(station.localSiteID))
    if (aurnDaqi == null) {
      return ['DAQI (observed)', NOT_AVAILABLE]
    }
    return ['DAQI (observed)', buildDaqiTag(aurnDaqi)]
  }
  const forecast = forecastForStation(forecasts, station)
  if (
    !forecast ||
    !Array.isArray(forecast.forecast) ||
    forecast.forecast.length === 0
  ) {
    return null
  }
  const forecastDaqi = toSafeDaqiIndex(
    daqiValueForDay(forecast, selectedForecastDay)
  )
  if (forecastDaqi == null) {
    return ['DAQI (forecast)', NOT_AVAILABLE]
  }
  return ['DAQI (forecast)', buildDaqiTag(forecastDaqi)]
}

/**
 * Builds the rows array for the station details definition list.
 * @param {object} station
 * @param {boolean} isClosed
 * @param {object} daqiContext - see {@link buildDaqiRow} for shape
 * @returns {Array}
 */
function buildPanelRows(station, isClosed, daqiContext) {
  const rows = []

  const pollutants = station.pollutants || []
  if (pollutants.length > 0) {
    const seen = []
    pollutants.forEach((code) => {
      const label = pollutantLabels[code] || code
      if (!seen.includes(label)) {
        seen.push(label)
      }
    })
    rows.push(['Pollutants', seen.join(', ')])
  }

  if (!isClosed) {
    const daqiRow = buildDaqiRow(station, daqiContext)
    if (daqiRow) {
      rows.push(daqiRow)
    }
  }

  rows.push(['Local authority', station.localAuthority || NOT_AVAILABLE])
  if (station.areaType) {
    rows.push(['Site type', station.areaType])
  }
  rows.push([
    'Start date',
    station.openDate ? formatDate(station.openDate) : NOT_AVAILABLE
  ])
  const endDate = station.closeDate
    ? formatDate(station.closeDate)
    : NOT_AVAILABLE
  if (isClosed) {
    rows.push(['End date', endDate])
  }

  return rows
}

/**
 * True when the observed (AURN) map shows the station as a grey marker because
 * it has no current reading. Forecast markers can also be grey, but that only
 * means there is no forecast, not that the station has stopped reporting.
 * @param {object} station
 * @param {object} daqiContext - see {@link buildDaqiRow} for shape
 * @returns {boolean}
 */
function isInactiveStation(station, { mapMode, aurnDataByStation }) {
  return (
    mapMode === 'aurn' &&
    toSafeDaqiIndex(aurnDataByStation.get(station.localSiteID)) == null
  )
}

/**
 * Sets the station panel heading (name + status tag).
 * @param {object} station
 * @param {string} status
 * @param {boolean} isClosed
 * @param {boolean} isInactive
 */
function renderStationHeading(station, status, isClosed, isInactive) {
  const tag = stationStatusTag(status, isClosed, isInactive)
  const heading = document.getElementById('sp-name')
  heading.textContent = station.name || ''
  if (tag) {
    heading.append(' ', tag)
  }
}

/**
 * Renders the station details definition list rows.
 * @param {object} station
 * @param {boolean} isClosed
 * @param {object} daqiContext - see {@link buildDaqiRow} for shape
 */
function renderStationDetails(station, isClosed, daqiContext) {
  const rows = buildPanelRows(station, isClosed, daqiContext).map(
    ([label, value]) => {
      const row = createElement('div', 'aq-station-info-row')
      const dd = createElement('dd')
      dd.append(value instanceof Node ? value : String(value))
      row.append(createElement('dt', '', `${label}:`), ' ', dd)
      return row
    }
  )
  document.getElementById('sp-details').replaceChildren(...rows)
}

/**
 * Shows or hides the station data-selector link, wiring up its hidden form
 * when the station has a usable location.
 * @param {object} station
 * @param {HTMLElement} stationPanelElement
 * @param {HTMLFormElement} stationFormElement
 */
function updateStationLinkForm(
  station,
  stationPanelElement,
  stationFormElement
) {
  const stationLink = document.getElementById('sp-station-link')
  if (!stationLink) {
    return
  }
  const [lat, lng] = station.location?.coordinates ?? []
  const dataSelectorUrl = stationPanelElement.dataset.dataselectorUrl
  const canLink = Boolean(
    // An empty URL means same origin, as when the map is served by the dataselector
    dataSelectorUrl !== undefined &&
      hasValidCoords(station) &&
      stationFormElement
  )
  if (!canLink) {
    stationLink.hidden = true
    return
  }
  stationFormElement.action = `${dataSelectorUrl}/station-summary`
  stationFormElement.elements.lat.value = lat
  stationFormElement.elements.lng.value = lng
  stationFormElement.elements.name.value = station.name ?? ''
  stationLink.hidden = false
}

/**
 * Restores the previously selected marker (if any) to its default DAQI colour.
 * @param {object} ctx
 * @param {object} ctx.map - the InteractiveMap instance
 * @param {() => Array<object>} ctx.getSortedStations
 * @param {() => object} ctx.getDaqiContext - see {@link buildDaqiRow} for shape
 * @param {object} ctx.panelState
 */
function restorePreviousMarker({
  map,
  getSortedStations,
  getDaqiContext,
  panelState
}) {
  if (!panelState.selectedMarkerId) {
    return
  }
  const prev = getSortedStations().find(
    (s) => stationMarkerId(s) === panelState.selectedMarkerId
  )
  if (prev) {
    map.addMarker(
      panelState.selectedMarkerId,
      stationMapCoords(prev),
      daqiMarkerOptions(
        stationDaqi({ station: prev, ...getDaqiContext() }),
        false
      )
    )
  }
}

/**
 * Populates and shows the station panel for the given station.
 * @param {{ name?: string, stationStatus?: string, status?: string, siteStatus?: string,
 *   pollutants?: string[], localAuthority?: string, areaType?: string,
 *   openDate?: string, closeDate?: string }} station
 * @param {object} ctx
 * @param {HTMLElement} ctx.stationPanelElement
 * @param {HTMLFormElement} ctx.stationFormElement
 * @param {() => object} ctx.getDaqiContext - see {@link buildDaqiRow} for shape
 * @param {object} ctx.panelState
 */
function showStationPanel(
  station,
  { stationPanelElement, stationFormElement, getDaqiContext, panelState }
) {
  if (!stationPanelElement?.isConnected) {
    return
  }

  const status = (
    station.stationStatus ||
    station.status ||
    station.siteStatus ||
    ''
  ).toLowerCase()
  const isClosed = status === 'closed'
  const daqiContext = getDaqiContext()

  renderStationHeading(
    station,
    status,
    isClosed,
    isInactiveStation(station, daqiContext)
  )
  renderStationDetails(station, isClosed, daqiContext)
  updateStationLinkForm(station, stationPanelElement, stationFormElement)

  panelState.panelTrigger = document.activeElement
  stationPanelElement.classList.add('visible')
  setStationPanelOpen(true)
  stationPanelElement.focus()
}

/**
 * Restores the previously selected marker to its DAQI colour and hides the station panel.
 * @param {object} ctx - see {@link restorePreviousMarker} for shape
 */
function closeStationPanel(ctx) {
  const { stationPanelElement, panelState } = ctx
  if (stationPanelElement) {
    stationPanelElement.classList.remove('visible')
  }
  restorePreviousMarker(ctx)
  panelState.selectedMarkerId = null
  setStationPanelOpen(false)
  panelState.panelTrigger?.focus()
  panelState.panelTrigger = null
}

/**
 * Selects a station: restores the previous marker, highlights the new one, and shows the panel.
 * @param {object} station
 * @param {object} ctx - see {@link restorePreviousMarker} and {@link showStationPanel} for shape
 */
function highlightStation(station, ctx) {
  const { map, getDaqiContext, panelState } = ctx
  restorePreviousMarker(ctx)
  panelState.selectedMarkerId = stationMarkerId(station)
  map.addMarker(
    panelState.selectedMarkerId,
    stationMapCoords(station),
    daqiMarkerOptions(stationDaqi({ station, ...getDaqiContext() }), true)
  )
  showStationPanel(station, ctx)
}

/**
 * Creates the station panel controller, bound to a single map instance.
 * Owns the selected-marker/focus-trigger state and the show/close/highlight
 * behaviour for the station information panel.
 * @param {object} params
 * @param {object} params.map - the InteractiveMap instance
 * @param {() => Array<object>} params.getSortedStations - returns the current stations list
 * @param {() => object} params.getDaqiContext - returns the current DAQI context, see {@link buildDaqiRow}
 * @returns {{ showStationPanel: Function, closeStationPanel: Function, highlightStation: Function, panelState: object }}
 */
function createStationPanelController({
  map,
  getSortedStations,
  getDaqiContext
}) {
  const ctx = {
    map,
    getSortedStations,
    getDaqiContext,
    stationPanelElement: document.getElementById('station-panel'),
    stationFormElement: document.getElementById('sp-station-form'),
    /** Tracks the currently highlighted marker and the element to restore focus to on close. */
    panelState: { selectedMarkerId: null, panelTrigger: null }
  }

  return {
    showStationPanel(station) {
      return showStationPanel(station, ctx)
    },
    closeStationPanel() {
      return closeStationPanel(ctx)
    },
    highlightStation(station) {
      return highlightStation(station, ctx)
    },
    panelState: ctx.panelState
  }
}

export { createStationPanelController }
