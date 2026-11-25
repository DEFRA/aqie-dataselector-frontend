// Below 1008px wide (including desktops at 200% zoom) the filter panel cannot
// sit beside the map key or station panel without overlapping them, so only
// one can be open. Keep in sync with the panel widths in _map.scss.
const SINGLE_PANEL_MEDIA_QUERY =
  'not all and (min-width: 63em) and (min-height: 25em)'

// Below 400px high (including desktops at 400% zoom) the panels fill the map,
// so they act as dialogs over it. Keep in sync with aq-full-screen-panels in
// _map.scss.
const FULL_SCREEN_MEDIA_QUERY = 'not all and (min-height: 25em)'

// Covered by a full-screen panel, so taken out of the focus order
const MAP_BACKGROUND_SELECTORS = [
  '#exit-map',
  '#map',
  '.reopen-stack',
  '.aq-map-zoom'
]

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

function matchesMedia(query) {
  return globalThis.matchMedia?.(query).matches ?? false
}

function isSinglePanelView() {
  return matchesMedia(SINGLE_PANEL_MEDIA_QUERY)
}

function isFullScreenView() {
  return matchesMedia(FULL_SCREEN_MEDIA_QUERY)
}

function setHidden(id, hidden) {
  const element = document.getElementById(id)
  if (element) {
    element.hidden = hidden
  }
}

/**
 * A button only shows while its panel is closed. The station panel covers the
 * map key, and the filter panel on smaller screens, without changing what is wanted
 * open.
 */
function updatePanelVisibility() {
  const { filterPanelOpen, mapKeyOpen, stationPanelOpen } = panelState
  const filterPanelCovered = stationPanelOpen && isSinglePanelView()

  setHidden(FILTER_PANEL_ID, !filterPanelOpen || filterPanelCovered)
  setHidden(MAP_KEY_OVERLAY_ID, !mapKeyOpen || stationPanelOpen)
  setHidden(FILTER_BUTTON_ID, filterPanelOpen && !filterPanelCovered)
  setHidden(KEY_BUTTON_ID, mapKeyOpen)

  const mapCovered =
    isFullScreenView() && (filterPanelOpen || mapKeyOpen || stationPanelOpen)
  MAP_BACKGROUND_SELECTORS.forEach((selector) => {
    const element = document.querySelector(selector)
    if (element) {
      element.inert = mapCovered
    }
  })
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
  if (isSinglePanelView()) {
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
  if (isSinglePanelView()) {
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

// The station panel handles its own Escape key
function closePanelOnEscape(event, closePanel) {
  if (event.key === 'Escape' && isFullScreenView()) {
    closePanel()
  }
}

function handleSinglePanelViewChange() {
  const mapKey = document.getElementById(MAP_KEY_OVERLAY_ID)
  const filterPanel = document.getElementById(FILTER_PANEL_ID)
  const mapKeyHadFocus = mapKey?.contains(document.activeElement)
  const filterPanelHadFocus = filterPanel?.contains(document.activeElement)

  if (
    isSinglePanelView() &&
    panelState.filterPanelOpen &&
    panelState.mapKeyOpen
  ) {
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
 * Smaller screens start with the filter panel open and the map key closed,
 * larger screens with both open, and short screens with both closed so the
 * map is not covered.
 * @param {object} params
 * @param {() => void} params.closeStationPanel - called when a button needs the
 *   space the station panel uses
 */
function initMapPanels({ closeStationPanel }) {
  callbacks.closeStationPanel = closeStationPanel
  panelState.filterPanelOpen = !isFullScreenView()
  panelState.mapKeyOpen = !isSinglePanelView()
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
  document
    .getElementById(FILTER_PANEL_ID)
    ?.addEventListener('keydown', (event) =>
      closePanelOnEscape(event, closeFilterPanel)
    )
  document
    .getElementById(MAP_KEY_OVERLAY_ID)
    ?.addEventListener('keydown', (event) =>
      closePanelOnEscape(event, closeMapKey)
    )
  globalThis
    .matchMedia?.(SINGLE_PANEL_MEDIA_QUERY)
    .addEventListener?.('change', handleSinglePanelViewChange)
  globalThis
    .matchMedia?.(FULL_SCREEN_MEDIA_QUERY)
    .addEventListener?.('change', updatePanelVisibility)

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
