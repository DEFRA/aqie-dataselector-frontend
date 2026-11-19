// Below 520px the filter panel and map key are bottom sheets, so only one can
// be open. The complement of `aq-above-mobile` in _map.scss.
const MOBILE_MEDIA_QUERY = 'not all and (min-width: 32.5em)'

const FILTER_PANEL_ID = 'filter-panel'
const FILTER_PANEL_CLOSE_ID = 'filter-panel-close'
const FILTER_BUTTON_ID = 'filter-button'
const MAP_KEY_OVERLAY_ID = 'map-key-overlay'
const MAP_KEY_CLOSE_ID = 'map-key-close'
const KEY_BUTTON_ID = 'key-button'

// What the user wants open. Visibility is derived from it in
// updatePanelVisibility
const panelState = {
  filterPanelOpen: true,
  mapKeyOpen: true,
  stationPanelOpen: false
}

const callbacks = { closeStationPanel: null }

function isMobileView() {
  return globalThis.matchMedia?.(MOBILE_MEDIA_QUERY).matches ?? false
}

function setHidden(id, hidden) {
  const element = document.getElementById(id)
  if (element) {
    element.hidden = hidden
  }
}

/**
 * A button only shows while its panel is closed. The station panel covers the
 * map key, and the filter panel on mobile, without changing what is wanted
 * open.
 */
function updatePanelVisibility() {
  const { filterPanelOpen, mapKeyOpen, stationPanelOpen } = panelState
  const filterPanelCovered = stationPanelOpen && isMobileView()

  setHidden(FILTER_PANEL_ID, !filterPanelOpen || filterPanelCovered)
  setHidden(MAP_KEY_OVERLAY_ID, !mapKeyOpen || stationPanelOpen)
  setHidden(FILTER_BUTTON_ID, filterPanelOpen && !filterPanelCovered)
  setHidden(KEY_BUTTON_ID, mapKeyOpen)
}

/** Keeps focus from being lost when the button that had it is hidden. */
function moveFocusTo(id) {
  document.getElementById(id)?.focus()
}

function closeStationPanelIfOpen() {
  if (panelState.stationPanelOpen) {
    callbacks.closeStationPanel?.()
  }
}

function openFilterPanel() {
  if (isMobileView()) {
    panelState.mapKeyOpen = false
    closeStationPanelIfOpen()
  }
  panelState.filterPanelOpen = true
  updatePanelVisibility()
  moveFocusTo(FILTER_PANEL_ID)
}

function closeFilterPanel() {
  panelState.filterPanelOpen = false
  updatePanelVisibility()
  moveFocusTo(FILTER_BUTTON_ID)
}

function openMapKey() {
  if (isMobileView()) {
    panelState.filterPanelOpen = false
  }
  // The station panel sits where the map key does
  closeStationPanelIfOpen()
  panelState.mapKeyOpen = true
  updatePanelVisibility()
  moveFocusTo(MAP_KEY_OVERLAY_ID)
}

function closeMapKey() {
  panelState.mapKeyOpen = false
  updatePanelVisibility()
  moveFocusTo(KEY_BUTTON_ID)
}

function handleMobileViewChange() {
  const mapKey = document.getElementById(MAP_KEY_OVERLAY_ID)
  const filterPanel = document.getElementById(FILTER_PANEL_ID)
  const mapKeyHadFocus = mapKey?.contains(document.activeElement)
  const filterPanelHadFocus = filterPanel?.contains(document.activeElement)

  if (isMobileView() && panelState.filterPanelOpen && panelState.mapKeyOpen) {
    panelState.mapKeyOpen = false
  }
  updatePanelVisibility()

  if (mapKeyHadFocus && mapKey.hidden) {
    moveFocusTo(KEY_BUTTON_ID)
  } else if (filterPanelHadFocus && filterPanel.hidden) {
    moveFocusTo(FILTER_BUTTON_ID)
  } else {
    // No panel had focus or the focused panel is still visible, do nothing
  }
}

/**
 * Sets the initial panel state and wires the panel and button clicks.
 * Mobile starts with the filter panel open and the map key closed, larger
 * screens with both open.
 * @param {object} params
 * @param {() => void} params.closeStationPanel - called when a button needs the
 *   space the station panel uses
 */
function initMapPanels({ closeStationPanel }) {
  callbacks.closeStationPanel = closeStationPanel
  panelState.filterPanelOpen = true
  panelState.mapKeyOpen = !isMobileView()
  panelState.stationPanelOpen = false

  document
    .getElementById(FILTER_PANEL_CLOSE_ID)
    ?.addEventListener('click', closeFilterPanel)
  document
    .getElementById(FILTER_BUTTON_ID)
    ?.addEventListener('click', openFilterPanel)
  document
    .getElementById(MAP_KEY_CLOSE_ID)
    ?.addEventListener('click', closeMapKey)
  document.getElementById(KEY_BUTTON_ID)?.addEventListener('click', openMapKey)
  globalThis
    .matchMedia?.(MOBILE_MEDIA_QUERY)
    .addEventListener?.('change', handleMobileViewChange)

  updatePanelVisibility()
}

/**
 * Records whether the station panel is open so the panels it covers are hidden.
 * @param {boolean} open
 */
function setStationPanelOpen(open) {
  panelState.stationPanelOpen = open
  updatePanelVisibility()
}

export { initMapPanels, setStationPanelOpen }
