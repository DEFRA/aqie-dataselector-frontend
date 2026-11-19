/**
 * Wires the zoom buttons to the map and disables each at its zoom limit.
 * @param {object} maplibreMap - the MapLibre map from the map:ready event
 */
function initZoomControls(maplibreMap) {
  const zoomInButton = document.getElementById('zoom-in')
  const zoomOutButton = document.getElementById('zoom-out')
  if (!maplibreMap || !zoomInButton || !zoomOutButton) {
    return
  }

  function updateZoomButtons() {
    const zoom = maplibreMap.getZoom()
    zoomInButton.disabled = zoom >= maplibreMap.getMaxZoom()
    zoomOutButton.disabled = zoom <= maplibreMap.getMinZoom()
  }

  zoomInButton.addEventListener('click', () => maplibreMap.zoomIn())
  zoomOutButton.addEventListener('click', () => maplibreMap.zoomOut())
  maplibreMap.on('zoom', updateZoomButtons)
  updateZoomButtons()
}

export { initZoomControls }
