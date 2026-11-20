// Close enough to show the station and its neighbours.
const NEARBY_STATIONS_ZOOM = 11

function renderMap(h, nearbyStationsView) {
  return h.view('map/index', {
    pageTitle: 'Air quality map',
    // The station panel posts to /station-summary on this same origin
    dataSelectorUrl: '',
    nearbyStationsView
  })
}

const mapController = {
  handler: (_request, h) => renderMap(h)
}

/**
 * Opens the map centred on the posted station, with that station selected.
 * Renders directly rather than redirecting; the client resets the address bar to /map.
 */
const nearbyStationsMapController = {
  handler(request, h) {
    const { lat, lng, siteId } = request.payload
    return renderMap(h, {
      center: [lng, lat],
      zoom: NEARBY_STATIONS_ZOOM,
      selectedStationId: siteId ? `ms-${siteId}` : undefined
    })
  }
}

export { mapController, nearbyStationsMapController }
