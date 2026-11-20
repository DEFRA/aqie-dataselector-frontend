/**
 * @jest-environment jsdom
 */

// map.js starts itself on import; wait for that start-up to finish
async function importMap() {
  const mapModule = await import('./map.js')
  await mapModule.ready
  return mapModule
}

async function waitFor(assertion, { timeout = 1000, interval = 10 } = {}) {
  const deadline = Date.now() + timeout
  for (;;) {
    try {
      return assertion()
    } catch (error) {
      if (Date.now() > deadline) throw error
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }
}

const originalGlobals = new Map()
function stubGlobal(key, value) {
  if (!originalGlobals.has(key)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
  }
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  })
}
function unstubAllGlobals() {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  originalGlobals.clear()
}

afterEach(unstubAllGlobals)
/* global KeyboardEvent, MouseEvent */

const defaultZoom = 5.4842222
const ukCentreLng = -1.4649
const ukCentreLat = 52.5619
const openFreeMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

let InteractiveMap
let mockMaplibreProvider
let mockMapInstance
let mapReadyCallback
let mapClickCallback

/**
 * Stubs fetch to return separate responses for stations, forecasts and aurn-data endpoints.
 */
function stubFetch({ stations = [], forecasts = [] } = {}) {
  stubGlobal(
    'fetch',
    jest.fn().mockImplementation((url) => {
      if (url === '/api/monitoring-stations') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stations })
        })
      }
      if (url === '/api/aurn-data') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ measurements: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(forecasts)
      })
    })
  )
}

/**
 * Resets the DOM to clear all accumulated event listeners from previous imports.
 * Must be called before each re-import in test helpers.
 */
function resetDom() {
  document.body.innerHTML = `
    <div id="map"></div>
    <div id="map-key-overlay" class="aq-map-key" role="region" aria-label="Map key" tabindex="-1" hidden>
      <button id="map-key-close" class="aq-map-key__close" type="button" aria-label="Close map key">
        <span class="govuk-visually-hidden">Close map key</span>
      </button>
      <div class="aq-map-key__body">
        <h2 class="govuk-heading-m govuk-!-margin-bottom-0">Key</h2>
        <p class="govuk-hint govuk-!-margin-top-1 govuk-!-margin-bottom-2">Daily Air Quality Index (DAQI)</p>
        <div id="map-key-body">
          <div class="aq-daqi-scale">
            <div class="aq-daqi-scale__bands">
              <div class="aq-daqi-scale__band aq-daqi-scale__band--1">1</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--1">2</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--1">3</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--4">4</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--4">5</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--4">6</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--7">7</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--7">8</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--7">9</div>
              <div class="aq-daqi-scale__band aq-daqi-scale__band--10">10</div>
            </div>
            <div class="aq-daqi-scale__labels">
              <div class="aq-daqi-scale__label-group aq-daqi-scale__label-group--low">
                <span class="aq-daqi-scale__level">Low</span>
                <span class="aq-daqi-scale__range">1 to 3</span>
              </div>
              <div class="aq-daqi-scale__label-group aq-daqi-scale__label-group--moderate">
                <span class="aq-daqi-scale__level">Moderate</span>
                <span class="aq-daqi-scale__range">4 to 6</span>
              </div>
              <div class="aq-daqi-scale__label-group aq-daqi-scale__label-group--high">
                <span class="aq-daqi-scale__level">High</span>
                <span class="aq-daqi-scale__range">7 to 9</span>
              </div>
              <div class="aq-daqi-scale__label-group aq-daqi-scale__label-group--veryhigh">
                <span class="aq-daqi-scale__level">Very high</span>
                <span class="aq-daqi-scale__range">10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="filter-panel" class="aq-filter-panel" role="region" aria-label="Search by pollutant" tabindex="-1">
      <button id="filter-panel-close" class="aq-filter-panel__close" type="button" aria-label="Close filter panel">
        <span class="govuk-visually-hidden">Close filter panel</span>
      </button>
      <div class="aq-filter-panel__body">
        <p class="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-0">Search by pollutant</p>
        <div class="aq-filter-panel__tabs" role="group" aria-label="Pollutant category">
          <button class="aq-filter-panel__tab aq-filter-panel__tab--active" id="filter-tab-daqi" aria-pressed="true"><span>DAQI pollutants</span></button>
          <button class="aq-filter-panel__tab" id="filter-tab-other" aria-pressed="false"><span>Other pollutants</span></button>
        </div>
        <div class="aq-filter-panel__scroll">
          <div id="filter-mount" class="aq-filter-panel__mount">
            <div id="filter-daqi-content">
              <div class="govuk-form-group">
                <fieldset class="govuk-fieldset">
                  <legend class="govuk-fieldset__legend govuk-visually-hidden">Select pollutants to display on the map</legend>
                  <div class="govuk-checkboxes govuk-checkboxes--small">
                    <div class="govuk-checkboxes__item">
                      <input class="govuk-checkboxes__input" id="filter-pollutant-1" type="checkbox" name="filter-pollutant" value="PM25" checked>
                      <label class="govuk-label govuk-checkboxes__label" for="filter-pollutant-1">Fine particulate matter (PM2.5)</label>
                    </div>
                    <div class="govuk-checkboxes__item">
                      <input class="govuk-checkboxes__input" id="filter-pollutant-2" type="checkbox" name="filter-pollutant" value="PM10" checked>
                      <label class="govuk-label govuk-checkboxes__label" for="filter-pollutant-2">Particulate matter (PM10)</label>
                    </div>
                    <div class="govuk-checkboxes__item">
                      <input class="govuk-checkboxes__input" id="filter-pollutant-3" type="checkbox" name="filter-pollutant" value="NO2" checked>
                      <label class="govuk-label govuk-checkboxes__label" for="filter-pollutant-3">Nitrogen dioxide (NO2)</label>
                    </div>
                    <div class="govuk-checkboxes__item">
                      <input class="govuk-checkboxes__input" id="filter-pollutant-4" type="checkbox" name="filter-pollutant" value="O3" checked>
                      <label class="govuk-label govuk-checkboxes__label" for="filter-pollutant-4">Ozone (O3)</label>
                    </div>
                    <div class="govuk-checkboxes__item">
                      <input class="govuk-checkboxes__input" id="filter-pollutant-5" type="checkbox" name="filter-pollutant" value="SO2" checked>
                      <label class="govuk-label govuk-checkboxes__label" for="filter-pollutant-5">Sulphur dioxide (SO2)</label>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
            <div id="filter-other-content" hidden>
              <p class="govuk-body-s govuk-!-margin-top-2">We will add more pollutants and data sources during 2026.</p>
            </div>
          </div>
          <div id="filter-sections">
            <hr class="govuk-section-break govuk-section-break--visible">
            <h3 class="govuk-heading-s">Data sources</h3>
            <div class="govuk-form-group">
              <fieldset class="govuk-fieldset">
                <legend class="govuk-fieldset__legend">Near real-time Defra data</legend>
                <div class="govuk-radios govuk-radios--small">
                  <div class="govuk-radios__item">
                    <input class="govuk-radios__input" id="filter-data-source" type="radio" name="filter-data-source" value="aurn" checked>
                    <label class="govuk-label govuk-radios__label" for="filter-data-source">Automatic Urban and Rural Network</label>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="reopen-stack" role="group" aria-label="Map actions">
      <button class="aq-map__menu reopen-btn" id="filter-button" type="button" aria-label="Open map menu" hidden>
        <span class="reopen-text">Menu</span>
      </button>
      <button class="aq-map__menu reopen-btn" id="key-button" type="button" aria-label="Open map key">
        <span class="reopen-text">Key</span>
      </button>
    </div>
    <div class="aq-map-zoom" role="group" aria-label="Zoom controls">
      <button id="zoom-in" type="button" aria-label="Zoom in"></button>
      <button id="zoom-out" type="button" aria-label="Zoom out"></button>
    </div>
    <a id="exit-map" href="/hubpage">Exit map</a>
    <div id="station-panel" data-dataselector-url="https://aqie-dataselector-frontend.example">
      <button id="sp-close"></button>
      <h2 id="sp-name"></h2>
      <dl id="sp-details"></dl>
      <form id="sp-station-form">
        <input name="lat">
        <input name="lng">
        <input name="name">
      </form>
      <a id="sp-station-link" hidden></a>
    </div>
  `
}

beforeEach(async () => {
  mapReadyCallback = null
  mapClickCallback = null

  resetDom()

  mockMapInstance = {
    on: jest.fn((event, cb) => {
      if (event === 'map:firstidle') mapReadyCallback = cb
      if (event === 'map:click') mapClickCallback = cb
    }),
    addMarker: jest.fn(),
    removeMarker: jest.fn()
  }
  InteractiveMap = jest.fn().mockImplementation(function () {
    return mockMapInstance
  })
  mockMaplibreProvider = jest.fn().mockReturnValue('maplibreProvider')
  stubGlobal('defra', {
    InteractiveMap,
    maplibreProvider: mockMaplibreProvider
  })
  stubFetch()
  jest.resetModules()
  await importMap()
})

describe('#map initialisation', () => {
  test('Should create an InteractiveMap with the UK centre coordinates', () => {
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        center: [ukCentreLng, ukCentreLat],
        zoom: defaultZoom
      })
    )
  })

  test('Should use the maplibre provider', () => {
    expect(mockMaplibreProvider).toHaveBeenCalled()
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        mapProvider: 'maplibreProvider'
      })
    )
  })

  test('Should configure the OpenFreeMap tile style', () => {
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        mapStyle: expect.objectContaining({
          url: openFreeMapStyleUrl
        })
      })
    )
  })

  test('Should set container height to 100%', () => {
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        containerHeight: '100%'
      })
    )
  })

  test('Should render the map inline so it is not hidden behind an open-map button on small screens', () => {
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        behaviour: 'inline'
      })
    )
  })

  test('Should register a map:firstidle event listener', () => {
    expect(mockMapInstance.on).toHaveBeenCalledWith(
      'map:firstidle',
      expect.any(Function)
    )
  })

  describe('plotting markers', () => {
    const station = {
      localSiteID: 'UKA001',
      name: 'London Test',
      stationStatus: 'current',
      pollutants: ['NO2'],
      location: { coordinates: [51.5, -0.1] }
    }

    // Holds back the stations response until releaseStations is called
    function stubSlowStations() {
      let releaseStations
      const stationsReleased = new Promise((resolve) => {
        releaseStations = resolve
      })
      stubGlobal(
        'fetch',
        jest.fn(async (url) => {
          if (url === '/api/monitoring-stations') {
            await stationsReleased
            return {
              ok: true,
              json: () => Promise.resolve({ stations: [station] })
            }
          }
          return { ok: true, json: () => Promise.resolve({ measurements: [] }) }
        })
      )
      return releaseStations
    }

    async function importMapWhileStationsLoad() {
      resetDom()
      mapReadyCallback = null
      const releaseStations = stubSlowStations()
      jest.resetModules()
      const mapImport = importMap()
      await waitFor(() => expect(mapReadyCallback).not.toBeNull())
      return { mapImport, releaseStations }
    }

    test('Should plot the markers when the map renders before the data has loaded', async () => {
      const { mapImport, releaseStations } = await importMapWhileStationsLoad()
      mapReadyCallback()
      releaseStations()
      await mapImport
      expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
        'ms-UKA001',
        expect.any(Array),
        expect.any(Object)
      )
    })

    test('Should not plot the markers until the map has rendered', async () => {
      const { mapImport, releaseStations } = await importMapWhileStationsLoad()
      releaseStations()
      await mapImport
      expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
      mapReadyCallback()
      expect(mockMapInstance.addMarker).toHaveBeenCalledTimes(1)
    })

    test('Should plot the markers once when the map renders before the data has loaded', async () => {
      const { mapImport, releaseStations } = await importMapWhileStationsLoad()
      mapReadyCallback()
      releaseStations()
      await mapImport
      expect(mockMapInstance.addMarker).toHaveBeenCalledTimes(1)
    })
  })

  test('Should fetch monitoring stations on load', () => {
    expect(fetch).toHaveBeenCalledWith('/api/monitoring-stations')
  })

  test('Should fetch forecasts on load', () => {
    expect(fetch).toHaveBeenCalledWith('/api/forecasts')
  })

  test('Should fetch AURN data on load', () => {
    expect(fetch).toHaveBeenCalledWith('/api/aurn-data')
  })

  test('Should populate aurnDataByStation when AURN data has measurements', async () => {
    const stations = [
      { localSiteID: 'UKA00651', location: { coordinates: [51.5, -0.1] } }
    ]
    const measurements = [{ localSiteID: 'UKA00651', daqiIndex: 2 }]
    resetDom()
    stubGlobal(
      'fetch',
      jest.fn().mockImplementation((url) => {
        if (url === '/api/monitoring-stations') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ stations })
          })
        }
        if (url === '/api/aurn-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ measurements })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    // Station should be coloured with DAQI 2 (non-grey) from AURN data
    const call = mockMapInstance.addMarker.mock.calls[0]
    expect(call[2].svgContent).toContain('#31ff00')
  })

  test('Should warn and continue when AURN data fetch fails', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    resetDom()
    stubGlobal(
      'fetch',
      jest.fn().mockImplementation((url) => {
        if (url === '/api/aurn-data') {
          return Promise.reject(new Error('network error'))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stations: [] })
        })
      })
    )
    jest.resetModules()
    await expect(importMap()).resolves.not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to load AURN data',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })
})

describe('#monitoring stations', () => {
  test('Should add markers when map:firstidle fires', async () => {
    const stations = [
      { localSiteID: 'UKA001', location: { coordinates: [51.5, -0.1] } }
    ]
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ stations })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      [-0.1, 51.5],
      expect.objectContaining({
        viewBox: '0 0 38 38',
        anchor: [0.5, 0.5]
      })
    )
  })

  test('Should add markers in north-to-south order', async () => {
    const stations = [
      { localSiteID: 'SOUTH', location: { coordinates: [51.5, -0.1] } },
      { localSiteID: 'NORTH', location: { coordinates: [57.1, -2.1] } }
    ]
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ stations })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    const markerIds = mockMapInstance.addMarker.mock.calls.map(
      (call) => call[0]
    )
    expect(markerIds).toEqual(['ms-NORTH', 'ms-SOUTH'])
  })

  test('Should convert [lat, lng] from API to [lng, lat] for the map', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.49492, -0.180564] }
      }
    ]
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ stations })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      [-0.180564, 51.49492],
      expect.any(Object)
    )
  })

  test('Should use ms-{localSiteID} as the marker id', async () => {
    const stations = [
      { localSiteID: 'MY_SITE', location: { coordinates: [53, -2] } }
    ]
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ stations })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker.mock.calls[0][0]).toBe('ms-MY_SITE')
    expect(mockMapInstance.addMarker.mock.calls[0][2]).toMatchObject({
      viewBox: '0 0 38 38'
    })
  })

  test.each([
    ['missing location', { localSiteID: 'NOLOC' }],
    ['null location', { localSiteID: 'UKA001', location: null }],
    [
      'non-array coordinates',
      { localSiteID: 'UKA001', location: { coordinates: 'invalid' } }
    ],
    [
      'NaN coordinates',
      { localSiteID: 'NANST', location: { coordinates: [Number.NaN, -0.1] } }
    ]
  ])('Should skip stations with %s', async (_, invalidStation) => {
    const stations = [
      invalidStation,
      { localSiteID: 'UKA002', location: { coordinates: [52, -1] } }
    ]
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ stations })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).toHaveBeenCalledTimes(1)
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA002',
      [-1, 52],
      expect.any(Object)
    )
  })

  test('Should not add markers when fetch returns a non-ok response', async () => {
    stubGlobal('fetch', jest.fn().mockResolvedValue({ ok: false }))
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
  })

  test('Should not throw when fetch fails', async () => {
    stubGlobal('fetch', jest.fn().mockRejectedValue(new Error('network error')))
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    jest.resetModules()
    await expect(importMap()).resolves.not.toThrow()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to load monitoring stations',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })

  test('Should handle a response with no stations property', async () => {
    stubGlobal(
      'fetch',
      jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
  })
})

async function loadWithForecasts(stations, forecasts) {
  resetDom()
  stubFetch({ stations, forecasts })
  jest.resetModules()
  await importMap()
  const { filterState } = await import('./map-filter-panel.js')
  filterState.mapMode = 'forecast'
  mapReadyCallback()
}

async function loadStationsAndIdle(stationList) {
  resetDom()
  stubGlobal(
    'fetch',
    jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ stations: stationList })
    })
  )
  jest.resetModules()
  await importMap()
  mapReadyCallback()
}

async function loadStationsAndIdleWithForecasts(stationList, forecasts) {
  resetDom()
  stubFetch({ stations: stationList, forecasts })
  jest.resetModules()
  await importMap()
  const { filterState } = await import('./map-filter-panel.js')
  filterState.mapMode = 'forecast'
  mapReadyCallback()
}

describe('#DAQI markers', () => {
  const station = {
    localSiteID: 'UKA001',
    location: { coordinates: [51.5, -0.1] }
  }
  const forecastAt = (lat, lng, value) => [
    { location: { coordinates: [lat, lng] }, forecast: [{ value }] }
  ]

  test.each([
    ['1–3', 2, '#31ff00', 'fill="#0b0c0c"'],
    ['4–6', 5, '#ffcf00', 'fill="#0b0c0c"'],
    ['7–9', 8, '#ff0000', 'fill="#ffffff"'],
    ['10', 10, '#ce30ff', 'fill="#ffffff"']
  ])(
    'Should colour marker for DAQI %s',
    async (_, daqiValue, backgroundColour, textColour) => {
      await loadWithForecasts([station], forecastAt(51.5, -0.1, daqiValue))
      const call = mockMapInstance.addMarker.mock.calls[0]
      expect(call[2].svgContent).toContain(backgroundColour)
      expect(call[2].svgContent).toContain(textColour)
      expect(call[2].svgContent).toContain(`>${daqiValue}<`)
    }
  )

  test('Should use grey marker when no forecast is close enough', async () => {
    // Forecast is > 0.05 degrees away
    await loadWithForecasts([station], forecastAt(52, -0.1, 5))
    const call = mockMapInstance.addMarker.mock.calls[0]
    expect(call[2].svgContent).toContain('fill="#777777"')
    expect(call[2].svgContent).toContain('stroke="white"')
  })

  test('Should use grey marker when no forecasts are available', async () => {
    await loadWithForecasts([station], [])
    const call = mockMapInstance.addMarker.mock.calls[0]
    expect(call[2].svgContent).toContain('fill="#777777"')
  })

  test('Should use dark grey with black stroke for selected station with no DAQI', async () => {
    await loadWithForecasts([station], [])
    mapClickCallback({ coords: [-0.1, 51.5] })
    const markerCalls = mockMapInstance.addMarker.mock.calls
    const selectedCall = markerCalls.find(
      (call) =>
        call[0] === 'ms-UKA001' && call[2].svgContent.includes('#0b0c0c')
    )
    expect(selectedCall).toBeDefined()
    expect(selectedCall[2].svgContent).toContain('fill="#555555"')
  })

  test('Should not plot a closed station', async () => {
    const closedStation = { ...station, stationStatus: 'closed' }
    await loadWithForecasts([closedStation], forecastAt(51.5, -0.1, 5))
    expect(mockMapInstance.addMarker).not.toHaveBeenCalledWith(
      expect.stringContaining('UKA001'),
      expect.any(Array),
      expect.any(Object)
    )
  })

  test('Should skip forecast entry with no coordinates and still match the next', async () => {
    const forecastWithMissingCoords = [
      { location: {} },
      { location: { coordinates: [51.5, -0.1] }, forecast: [{ value: 4 }] }
    ]
    await loadWithForecasts([station], forecastWithMissingCoords)
    const call = mockMapInstance.addMarker.mock.calls[0]
    expect(call[2].svgContent).toContain('#ffff00')
    expect(call[2].svgContent).toContain('>4<')
  })
})

describe('#station panel', () => {
  const station = {
    localSiteID: 'UKA001',
    name: 'London Test',
    localAuthority: 'Greater London',
    areaType: 'Urban Background',
    openDate: '2000-01-15',
    stationStatus: 'current',
    pollutants: ['NO2', 'PM10'],
    location: { coordinates: [51.5, -0.1] }
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('Should show station panel when clicking near a station', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
  })

  test('Should populate station name in the panel', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-name').textContent).toContain(
      'London Test'
    )
  })

  test('Should set and unhide the station summary link when coordinates and dataselector URL are present', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    const link = document.getElementById('sp-station-link')
    const form = document.getElementById('sp-station-form')
    expect(link.hidden).toBe(false)
    expect(form.action).toBe(
      'https://aqie-dataselector-frontend.example/station-summary'
    )
    expect(form.elements.lat.value).toBe('51.5')
    expect(form.elements.lng.value).toBe('-0.1')
    expect(form.elements.name.value).toBe('London Test')
  })

  test('Should submit the hidden form (not navigate via href) when the station summary link is clicked', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    const form = document.getElementById('sp-station-form')
    const submitSpy = jest
      .spyOn(form, 'submit')
      .mockImplementation(() => undefined)
    document.getElementById('sp-station-link').click()
    expect(submitSpy).toHaveBeenCalled()
  })

  test('Should hide the station summary link when the panel has no dataselector URL', async () => {
    await loadStationsAndIdle([station])
    document
      .getElementById('station-panel')
      .removeAttribute('data-dataselector-url')
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-station-link').hidden).toBe(true)
  })

  test('Should hide the station summary link when the station has no coordinates', async () => {
    const noCoordsStation = { ...station, location: { coordinates: [] } }
    await loadStationsAndIdle([noCoordsStation])
    globalThis.navigateToStation(noCoordsStation)
    expect(document.getElementById('sp-station-link').hidden).toBe(true)
  })

  test('Should populate station details in the panel', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain(
      'Greater London'
    )
    expect(document.getElementById('sp-details').textContent).toContain(
      'Urban Background'
    )
  })

  test('Should render the selected marker with a distinct style', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    const markerCalls = mockMapInstance.addMarker.mock.calls
    const selectedCall = markerCalls.find(
      (call) =>
        call[0] === 'ms-UKA001' && call[2].svgContent.includes('#0b0c0c')
    )
    expect(selectedCall).toBeDefined()
  })

  test('Should restore the previous marker when a new station is selected', async () => {
    const station2 = {
      localSiteID: 'UKA002',
      name: 'Manchester Test',
      location: { coordinates: [53.5, -2.2] }
    }
    await loadStationsAndIdle([station, station2])
    mapClickCallback({ coords: [-0.1, 51.5] })
    mockMapInstance.addMarker.mockClear()
    mapClickCallback({ coords: [-2.2, 53.5] })
    // First call restores UKA001 to default style
    expect(mockMapInstance.addMarker.mock.calls[0][0]).toBe('ms-UKA001')
    expect(mockMapInstance.addMarker.mock.calls[0][2].svgContent).toContain(
      'stroke="white"'
    )
  })

  test('Should not show panel when clicking outside the 0.1 degree radius', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [5, 60] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })

  describe('pixel-based click selection', () => {
    const panelVisible = () =>
      document.getElementById('station-panel').classList.contains('visible')

    async function loadWithProjection(stations, projected) {
      await loadStationsAndIdle(stations)
      const [, onMapReady] = mockMapInstance.on.mock.calls.findLast(
        ([event]) => event === 'map:ready'
      )
      onMapReady({
        map: {
          project: jest.fn(() => projected),
          getZoom: jest.fn(() => 6),
          getMinZoom: jest.fn(() => 0),
          getMaxZoom: jest.fn(() => 16),
          on: jest.fn()
        }
      })
    }

    test('Should select a station when the click is within the pixel radius', async () => {
      await loadWithProjection([station], { x: 100, y: 100 })
      mapClickCallback({ coords: [5, 60], point: { x: 110, y: 110 } })
      expect(panelVisible()).toBe(true)
    })

    test('Should not select a station when the click is beyond the pixel radius', async () => {
      await loadWithProjection([station], { x: 100, y: 100 })
      mapClickCallback({ coords: [-0.1, 51.5], point: { x: 150, y: 100 } })
      expect(panelVisible()).toBe(false)
    })

    test('Should not select a station hidden by the pollutant filter', async () => {
      const hidden = { ...station, pollutants: ['NOT_SELECTED'] }
      await loadWithProjection([hidden], { x: 100, y: 100 })
      mapClickCallback({ coords: [-0.1, 51.5], point: { x: 100, y: 100 } })
      expect(panelVisible()).toBe(false)
    })
  })

  test('Should hide panel and restore marker when close button is clicked', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
    mockMapInstance.addMarker.mockClear()
    document.getElementById('sp-close').click()
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
    // Marker restored to default
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      expect.any(Array),
      expect.objectContaining({
        svgContent: expect.stringContaining('stroke="white"')
      })
    )
  })

  test('Should do nothing on map:click when evt has no coords', async () => {
    await loadStationsAndIdle([station])
    mapReadyCallback()
    mockMapInstance.addMarker.mockClear()
    mapClickCallback({})
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })

  test('Should show DAQI row in the panel when a forecast is available', async () => {
    const forecast = [
      { location: { coordinates: [51.5, -0.1] }, forecast: [{ value: 3 }] }
    ]
    await loadStationsAndIdleWithForecasts([station], forecast)
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain('DAQI')
    expect(document.getElementById('sp-details').textContent).toContain('3')
    expect(document.getElementById('sp-details').textContent).toContain('low')
  })

  test('Should not show DAQI row in the panel for a closed station', async () => {
    const closedStation = { ...station, stationStatus: 'closed' }
    const forecast = [
      { location: { coordinates: [51.5, -0.1] }, forecast: [{ value: 5 }] }
    ]
    await loadStationsAndIdleWithForecasts([closedStation], forecast)
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).not.toContain(
      'DAQI'
    )
  })

  test('Should hide the map key overlay when the station panel opens', async () => {
    await loadStationsAndIdle([station])
    const overlay = document.getElementById('map-key-overlay')
    expect(overlay.hidden).toBe(false)
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(overlay.hidden).toBe(true)
  })

  test('Should show the map key overlay when the station panel closes', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    document.getElementById('sp-close').click()
    expect(document.getElementById('map-key-overlay').hidden).toBe(false)
  })

  test('Should not reopen map key when user dismissed it before closing the panel', async () => {
    await loadStationsAndIdle([station])
    // User explicitly closes the key overlay
    document.getElementById('map-key-close').click()
    mapClickCallback({ coords: [-0.1, 51.5] })
    document.getElementById('sp-close').click()
    // Key should remain hidden
    expect(document.getElementById('map-key-overlay').hidden).toBe(true)
  })

  test('Should do nothing when station panel element is not in DOM', async () => {
    await loadStationsAndIdle([station])
    document.getElementById('station-panel').remove()
    expect(() => mapClickCallback({ coords: [-0.1, 51.5] })).not.toThrow()
  })

  test('Should render an unparseable openDate as-is in the panel', async () => {
    const stationWithBadDate = { ...station, openDate: 'not-a-date' }
    await loadStationsAndIdle([stationWithBadDate])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain(
      'not-a-date'
    )
  })

  test('Should skip stations with NaN coordinates during map:click', async () => {
    const validStation = {
      localSiteID: 'UKA001',
      name: 'London Test',
      location: { coordinates: [51.5, -0.1] }
    }
    const nanStation = {
      localSiteID: 'NANST',
      location: { coordinates: [Number.NaN, Number.NaN] }
    }
    await loadStationsAndIdle([nanStation, validStation])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
  })

  test('Should not throw when close button is clicked with no station selected', async () => {
    await loadStationsAndIdle([station])
    // Close without ever selecting a station — selectedMarkerId is null
    expect(() => document.getElementById('sp-close').click()).not.toThrow()
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })

  test('Should render end date row for a closed station with a closeDate', async () => {
    const closedStation = {
      localSiteID: 'UKA001',
      name: 'Old Station',
      location: { coordinates: [51.5, -0.1] },
      stationStatus: 'closed',
      closeDate: '2020-12-31'
    }
    await loadStationsAndIdle([closedStation])
    globalThis.navigateToStation(closedStation)
    const details = document.getElementById('sp-details')
    expect(details.textContent).toContain('End date')
    expect(details.textContent).toContain('31 December 2020')
  })

  test('Should not select a closed station via ambient map click', async () => {
    const closedStation = {
      localSiteID: 'UKA001',
      name: 'Old Station',
      location: { coordinates: [51.5, -0.1] },
      stationStatus: 'closed',
      closeDate: '2020-12-31'
    }
    await loadStationsAndIdle([closedStation])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })

  test('Should fall back to the raw code for an unrecognised pollutant', async () => {
    const stationWithCustom = {
      ...station,
      pollutants: ['NO2', 'CUSTOM_CODE']
    }
    await loadStationsAndIdle([stationWithCustom])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain(
      'CUSTOM_CODE'
    )
  })

  test('Should deduplicate pollutant labels in the panel', async () => {
    const stationWithDupes = { ...station, pollutants: ['NO2', 'NO2'] }
    await loadStationsAndIdle([stationWithDupes])
    mapClickCallback({ coords: [-0.1, 51.5] })
    const text = document.getElementById('sp-details').textContent
    expect([...text.matchAll(/NO₂/g)]).toHaveLength(1)
  })

  test('Should render a plain DAQI tag when the forecast value is out of band range', async () => {
    const forecast = [
      { location: { coordinates: [51.5, -0.1] }, forecast: [{ value: 11 }] }
    ]
    await loadStationsAndIdleWithForecasts([station], forecast)
    mapClickCallback({ coords: [-0.1, 51.5] })
    const details = document.getElementById('sp-details')
    expect(details.innerHTML).toContain('class="aq-daqi-tag"')
    expect(details.innerHTML).not.toContain('aq-daqi-tag--')
    expect(details.textContent).toContain('11')
  })

  test('Should show DAQI (forecast) as Not available when the forecast value is not a number', async () => {
    const forecast = [
      {
        location: { coordinates: [51.5, -0.1] },
        forecast: [{ value: 'unavailable' }]
      }
    ]
    await loadStationsAndIdleWithForecasts([station], forecast)
    mapClickCallback({ coords: [-0.1, 51.5] })
    const details = document.getElementById('sp-details')
    expect(details.textContent).toContain('DAQI (forecast)')
    expect(details.textContent).toContain('Not available')
  })

  test('Should move focus to the station panel when it opens', async () => {
    await loadStationsAndIdle([station])
    const panel = document.getElementById('station-panel')
    const focusSpy = jest.spyOn(panel, 'focus')
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(focusSpy).toHaveBeenCalled()
  })

  test('Should return focus to the triggering element when the panel closes', async () => {
    await loadStationsAndIdle([station])
    const exitBtn = document.getElementById('exit-map')
    exitBtn.focus()
    mapClickCallback({ coords: [-0.1, 51.5] })
    const focusSpy = jest.spyOn(exitBtn, 'focus')
    document.getElementById('sp-close').click()
    expect(focusSpy).toHaveBeenCalled()
  })

  test('Should close the station panel when Escape is pressed', async () => {
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
    document
      .getElementById('station-panel')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })
})

async function loadWithMarkerDom(stationList) {
  resetDom()
  stubGlobal(
    'fetch',
    jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ stations: stationList })
    })
  )
  mockMapInstance.addMarker.mockImplementation((id) => {
    if (document.getElementById(`map-marker-${id}`)) return
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    el.id = `map-marker-${id}`
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Map marker')
    document.getElementById('map')?.appendChild(el)
  })
  jest.resetModules()
  await importMap()
  mapReadyCallback()
  await Promise.resolve()
}

describe('#AURN mode station panel', () => {
  const station = {
    localSiteID: 'UKA00651',
    name: 'London Bloomsbury',
    pollutants: ['NO2'],
    localAuthority: 'Greater London',
    areaType: 'Urban Background',
    openDate: '2000-01-15',
    location: { coordinates: [51.5, -0.1] }
  }

  test('Should show DAQI (observed) as Not available when station has no AURN data', async () => {
    // stubFetch returns empty measurements by default — AURN mode, no data for this station
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain(
      'DAQI (observed)'
    )
    expect(document.getElementById('sp-details').textContent).toContain(
      'Not available'
    )
  })

  test('Should show DAQI (observed) tag with correct band when station has AURN data', async () => {
    const measurements = [{ localSiteID: 'UKA00651', daqiIndex: 2 }]
    resetDom()
    stubFetch({ stations: [station], forecasts: [] })
    stubGlobal(
      'fetch',
      jest.fn().mockImplementation((url) => {
        if (url === '/api/monitoring-stations') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ stations: [station] })
          })
        }
        if (url === '/api/aurn-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ measurements })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    mapClickCallback({ coords: [-0.1, 51.5] })
    expect(document.getElementById('sp-details').textContent).toContain(
      'DAQI (observed)'
    )
    expect(document.getElementById('sp-details').textContent).toContain('2')
    expect(document.getElementById('sp-details').textContent).toContain('low')
  })
})

describe('#forecast day controls', () => {
  const station = {
    localSiteID: 'UKA001',
    location: { coordinates: [51.5, -0.1] }
  }

  test('Should create a day button for each day in the forecast when in forecast mode', async () => {
    const forecasts = [
      {
        location: { coordinates: [51.5, -0.1] },
        forecast: [
          { day: 'Mon', value: 2 },
          { day: 'Tue', value: 3 }
        ]
      }
    ]
    resetDom()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="forecast-day-group"></div>'
    )
    stubFetch({ stations: [station], forecasts })
    jest.resetModules()
    await importMap()
    const { filterState } = await import('./map-filter-panel.js')
    filterState.mapMode = 'forecast'
    mapReadyCallback()
    const group = document.getElementById('forecast-day-group')
    expect(group.querySelectorAll('button')).toHaveLength(2)
    expect(group.textContent).toContain('Mon')
    expect(group.textContent).toContain('Tue')
  })

  test('Should not create day buttons when forecasts array is empty', async () => {
    resetDom()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="forecast-day-group"></div>'
    )
    stubFetch({ stations: [station], forecasts: [] })
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    const group = document.getElementById('forecast-day-group')
    expect(group.querySelectorAll('button')).toHaveLength(0)
  })

  test('Should update selectedForecastDay and replot markers when a day button is clicked', async () => {
    const forecasts = [
      {
        location: { coordinates: [51.5, -0.1] },
        forecast: [
          { day: 'Mon', value: 2 },
          { day: 'Tue', value: 5 }
        ]
      }
    ]
    resetDom()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="forecast-day-group"></div>'
    )
    stubFetch({ stations: [station], forecasts })
    jest.resetModules()
    await importMap()
    const { filterState } = await import('./map-filter-panel.js')
    filterState.mapMode = 'forecast'
    mapReadyCallback()
    const group = document.getElementById('forecast-day-group')
    const tuesdayBtn = [...group.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Tue'
    )
    mockMapInstance.addMarker.mockClear()
    tuesdayBtn.click()
    expect(mockMapInstance.addMarker).toHaveBeenCalled()
    expect(tuesdayBtn.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('#marker keyboard accessibility', () => {
  const station = {
    localSiteID: 'UKA001',
    name: 'London Test',
    location: { coordinates: [51.5, -0.1] }
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('Should set tabindex="0" on the marker element', async () => {
    await loadWithMarkerDom([station])
    expect(
      document.getElementById('map-marker-ms-UKA001')?.getAttribute('tabindex')
    ).toBe('0')
  })

  test('Should set role="button" on the marker element', async () => {
    await loadWithMarkerDom([station])
    expect(
      document.getElementById('map-marker-ms-UKA001')?.getAttribute('role')
    ).toBe('button')
  })

  test('Should set aria-label to the station name on the marker element', async () => {
    await loadWithMarkerDom([station])
    expect(
      document
        .getElementById('map-marker-ms-UKA001')
        ?.getAttribute('aria-label')
    ).toBe('London Test')
  })

  test('Should use "Monitoring station" as aria-label when station has no name', async () => {
    const unnamed = {
      localSiteID: 'UKA001',
      location: { coordinates: [51.5, -0.1] }
    }
    await loadWithMarkerDom([unnamed])
    expect(
      document
        .getElementById('map-marker-ms-UKA001')
        ?.getAttribute('aria-label')
    ).toBe('Monitoring station')
  })

  test('Should set data-keyboard-init on the marker element', async () => {
    await loadWithMarkerDom([station])
    expect(
      document.getElementById('map-marker-ms-UKA001')?.dataset.keyboardInit
    ).toBe('true')
  })

  test('Should open station panel when Enter is pressed on a marker', async () => {
    await loadWithMarkerDom([station])
    document
      .getElementById('map-marker-ms-UKA001')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
  })

  test('Should open station panel when Space is pressed on a marker', async () => {
    await loadWithMarkerDom([station])
    document
      .getElementById('map-marker-ms-UKA001')
      .dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
  })

  test('Should focus the filter panel close button when Escape is pressed and the panel is open', async () => {
    await loadWithMarkerDom([station])
    const filterPanel = document.getElementById('filter-panel')
    filterPanel.hidden = false
    const focusSpy = jest.spyOn(
      document.getElementById('filter-panel-close'),
      'focus'
    )
    document
      .getElementById('map-marker-ms-UKA001')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    expect(focusSpy).toHaveBeenCalled()
  })

  test('Should focus the filter button when Escape is pressed and the panel is closed', async () => {
    await loadWithMarkerDom([station])
    document.getElementById('filter-panel').hidden = true
    const focusSpy = jest.spyOn(
      document.getElementById('filter-button'),
      'focus'
    )
    document
      .getElementById('map-marker-ms-UKA001')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    expect(focusSpy).toHaveBeenCalled()
  })

  test('Should not throw when neither the marker container nor #map exists in the DOM', async () => {
    resetDom()
    document.getElementById('map').remove()
    stubFetch()
    jest.resetModules()
    await importMap()
    expect(() => mapReadyCallback()).not.toThrow()
  })

  test('Should skip non-element nodes added to the marker container', async () => {
    await loadWithMarkerDom([station])
    document.getElementById('map').appendChild(document.createTextNode('noise'))
    await Promise.resolve()
    expect(
      document.getElementById('map-marker-ms-UKA001')?.getAttribute('tabindex')
    ).toBe('0')
  })

  test('Should skip elements whose id does not start with map-marker-', async () => {
    await loadWithMarkerDom([station])
    const nonMarker = document.createElement('div')
    nonMarker.id = 'some-other-element'
    document.getElementById('map').appendChild(nonMarker)
    await Promise.resolve()
    expect(nonMarker.getAttribute('tabindex')).toBeNull()
  })

  test('Should not re-initialise a marker element that already has keyboard-init set', async () => {
    await loadWithMarkerDom([station])
    const markerEl = document.getElementById('map-marker-ms-UKA001')
    const addEventSpy = jest.spyOn(markerEl, 'addEventListener')
    // Remove and re-add to trigger the MutationObserver again
    markerEl.remove()
    document.getElementById('map').appendChild(markerEl)
    await Promise.resolve()
    expect(addEventSpy).not.toHaveBeenCalled()
  })

  test('Should blur a focused marker on mousedown on the map container', async () => {
    await loadWithMarkerDom([station])
    const markerEl = document.getElementById('map-marker-ms-UKA001')
    markerEl.focus()
    const blurSpy = jest.spyOn(markerEl, 'blur')
    document
      .getElementById('map')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(blurSpy).toHaveBeenCalled()
  })
})

async function loadAndIdle() {
  resetDom()
  stubFetch()
  jest.resetModules()
  await importMap()
  mapReadyCallback()
}

async function loadAndIdleWithFilter(options = {}) {
  resetDom()
  stubFetch(options)
  jest.resetModules()
  await importMap()
  mapReadyCallback()
}

describe('#map key overlay', () => {
  test('Should populate key overlay content on map:firstidle', async () => {
    await loadAndIdle()
    const overlay = document.getElementById('map-key-overlay')
    expect(overlay.querySelector('#map-key-close')).toBeDefined()
    expect(overlay.querySelector('h2').textContent).toBe('Key')
    expect(overlay.textContent).toContain('DAQI')
  })

  test('Should render DAQI scale bands 1–10', async () => {
    await loadAndIdle()
    const body = document.getElementById('map-key-body')
    expect(body.textContent).toContain('1')
    expect(body.textContent).toContain('10')
    expect(body.textContent).toContain('Low')
    expect(body.textContent).toContain('Very high')
  })

  test('Should hide key overlay when close button is clicked', async () => {
    await loadAndIdle()
    const overlay = document.getElementById('map-key-overlay')
    document.getElementById('map-key-close').click()
    expect(overlay.hidden).toBe(true)
  })

  test('Should initialise the Key reopen button in the reopen stack', async () => {
    await loadAndIdle()
    expect(document.getElementById('key-button')).not.toBeNull()
    expect(document.querySelector('.reopen-stack').textContent).toContain('Key')
  })

  test('Should show the key overlay and hide the Key button when the page loads', async () => {
    await loadAndIdle()
    expect(document.getElementById('map-key-overlay').hidden).toBe(false)
    expect(document.getElementById('key-button').hidden).toBe(true)
  })

  test('Should show the Key button once the map key has been closed', async () => {
    await loadAndIdle()
    document.getElementById('map-key-close').click()
    expect(document.getElementById('key-button').hidden).toBe(false)
  })

  test('Should move focus to the Key button when the map key is closed', async () => {
    await loadAndIdle()
    document.getElementById('map-key-close').click()
    expect(document.activeElement).toBe(document.getElementById('key-button'))
  })

  test('Should reopen the map key and hide the Key button when the Key button is clicked', async () => {
    await loadAndIdle()
    document.getElementById('map-key-close').click()
    document.getElementById('key-button').click()
    expect(document.getElementById('map-key-overlay').hidden).toBe(false)
    expect(document.getElementById('key-button').hidden).toBe(true)
  })

  test('Should move focus to the map key when it is reopened', async () => {
    await loadAndIdle()
    document.getElementById('map-key-close').click()
    document.getElementById('key-button').click()
    expect(document.activeElement).toBe(
      document.getElementById('map-key-overlay')
    )
  })

  test('Should respond to the map key close button before the map has finished its first render', async () => {
    resetDom()
    stubFetch()
    jest.resetModules()
    await importMap()
    document.getElementById('map-key-close').click()
    expect(document.getElementById('map-key-overlay').hidden).toBe(true)
  })

  test('Should expose globalThis.navigateToStation', async () => {
    const station = {
      localSiteID: 'UKA001',
      name: 'Test Station',
      stationStatus: 'current',
      location: { coordinates: [51.5, -0.1] }
    }
    stubFetch({ stations: [station] })
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    globalThis.navigateToStation(station)
    // highlightStation was called: marker updated to selected style
    const markerCalls = mockMapInstance.addMarker.mock.calls
    const selectedCall = markerCalls.find(
      (call) =>
        call[0] === 'ms-UKA001' && call[2].svgContent.includes('#0b0c0c')
    )
    expect(selectedCall).toBeDefined()
  })
})

describe('#filter panel', () => {
  test('Should render the filter panel on map:firstidle', async () => {
    await loadAndIdleWithFilter()
    const panel = document.getElementById('filter-panel')
    expect(panel.querySelector('#filter-panel-close')).not.toBeNull()
    expect(panel.querySelector('.aq-filter-panel__tabs')).not.toBeNull()
    expect(panel.querySelector('#filter-mount')).not.toBeNull()
  })

  test('Should render DAQI pollutant checkboxes by default', async () => {
    await loadAndIdleWithFilter()
    const mount = document.getElementById('filter-mount')
    expect(mount.textContent).toContain('Nitrogen dioxide')
    expect(mount.textContent).toContain('Ozone')
    expect(mount.textContent).toContain('Fine particulate matter')
  })

  test('Should render data sources and map features sections', async () => {
    await loadAndIdleWithFilter()
    const sections = document.getElementById('filter-sections')
    expect(sections.textContent).toContain('Data sources')
  })

  test('Should add a Menu button to the reopen stack', async () => {
    await loadAndIdleWithFilter()
    expect(document.getElementById('filter-button')).not.toBeNull()
    expect(document.querySelector('.reopen-stack').textContent).toContain(
      'Menu'
    )
  })

  test('Should hide filter panel and show the Menu button when close button clicked', async () => {
    await loadAndIdleWithFilter()
    const panel = document.getElementById('filter-panel')
    const menuBtn = document.getElementById('filter-button')
    expect(menuBtn.hidden).toBe(true)
    document.getElementById('filter-panel-close').click()
    expect(panel.hidden).toBe(true)
    expect(menuBtn.hidden).toBe(false)
    expect(document.activeElement).toBe(menuBtn)
  })

  test('Should reopen the filter panel and hide the Menu button when the Menu button is clicked', async () => {
    await loadAndIdleWithFilter()
    const panel = document.getElementById('filter-panel')
    const menuBtn = document.getElementById('filter-button')
    document.getElementById('filter-panel-close').click()
    menuBtn.click()
    expect(panel.hidden).toBe(false)
    expect(menuBtn.hidden).toBe(true)
    expect(document.activeElement).toBe(panel)
  })

  test('Should respond to the filter panel close button before the map has finished its first render', async () => {
    resetDom()
    stubFetch()
    jest.resetModules()
    await importMap()
    document.getElementById('filter-panel-close').click()
    expect(document.getElementById('filter-panel').hidden).toBe(true)
  })

  test('Should switch to Other pollutants tab when clicked', async () => {
    await loadAndIdleWithFilter()
    document.getElementById('filter-tab-other').click()
    expect(document.getElementById('filter-other-content').hidden).toBe(false)
    expect(document.getElementById('filter-daqi-content').hidden).toBe(true)
    expect(
      document.getElementById('filter-tab-other').getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      document.getElementById('filter-tab-daqi').getAttribute('aria-pressed')
    ).toBe('false')
  })

  test('Should switch back to DAQI tab when clicked', async () => {
    await loadAndIdleWithFilter()
    document.getElementById('filter-tab-other').click()
    document.getElementById('filter-tab-daqi').click()
    expect(document.getElementById('filter-daqi-content').hidden).toBe(false)
    expect(document.getElementById('filter-other-content').hidden).toBe(true)
    expect(
      document.getElementById('filter-tab-daqi').getAttribute('aria-pressed')
    ).toBe('true')
  })

  test('Should remove marker when pollutant checkbox is unchecked', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    mockMapInstance.addMarker.mockClear()
    mockMapInstance.removeMarker.mockClear()
    // Uncheck NO2 checkbox
    const no2Checkbox = Array.from(
      document.querySelectorAll(
        '.aq-filter-panel__scroll input[type="checkbox"]'
      )
    ).find((el) => el.value === 'NO2')
    no2Checkbox.checked = false
    no2Checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(mockMapInstance.removeMarker).toHaveBeenCalledWith('ms-UKA001')
  })

  test('Should add marker back when pollutant checkbox is re-checked', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    // Uncheck then re-check NO2
    const no2Checkbox = Array.from(
      document.querySelectorAll(
        '.aq-filter-panel__scroll input[type="checkbox"]'
      )
    ).find((el) => el.value === 'NO2')
    no2Checkbox.checked = false
    no2Checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    mockMapInstance.addMarker.mockClear()
    no2Checkbox.checked = true
    no2Checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      [-0.1, 51.5],
      expect.any(Object)
    )
  })

  test('Should show all stations when switched to Other pollutants tab', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    mockMapInstance.addMarker.mockClear()
    document.getElementById('filter-tab-other').click()
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      [-0.1, 51.5],
      expect.any(Object)
    )
  })

  test('Should show station with no pollutant data regardless of selected filter', async () => {
    const noPollutantsStation = {
      localSiteID: 'UKA002',
      location: { coordinates: [52, -1] },
      pollutants: []
    }
    await loadAndIdleWithFilter({ stations: [noPollutantsStation] })
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA002',
      [-1, 52],
      expect.any(Object)
    )
  })

  test('Should remove marker when all DAQI pollutants are deselected', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2', 'PM10', 'O3', 'SO2', 'PM25']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    mockMapInstance.removeMarker.mockClear()
    const pollutantCheckboxes = Array.from(
      document.querySelectorAll(
        '.aq-filter-panel__scroll input[type="checkbox"]'
      )
    )
    pollutantCheckboxes.forEach((checkbox) => {
      checkbox.checked = false
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(mockMapInstance.removeMarker).toHaveBeenCalledWith('ms-UKA001')
  })

  test('Should ignore a non-checkbox change event on the scroll container', async () => {
    await loadAndIdleWithFilter()
    mockMapInstance.addMarker.mockClear()
    const scroll = document.querySelector('.aq-filter-panel__scroll')
    const div = document.createElement('div')
    scroll.appendChild(div)
    div.dispatchEvent(new Event('change', { bubbles: true }))
    expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
  })

  test('Should never plot a closed station', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        stationStatus: 'closed',
        pollutants: ['NO2']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    expect(mockMapInstance.addMarker).not.toHaveBeenCalledWith(
      'ms-UKA001',
      expect.any(Array),
      expect.any(Object)
    )
  })

  test('Should never plot an inactive station', async () => {
    const stations = [
      {
        localSiteID: 'UKA002',
        location: { coordinates: [52.0, -0.2] },
        stationStatus: 'inactive',
        pollutants: ['PM10']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    expect(mockMapInstance.addMarker).not.toHaveBeenCalledWith(
      'ms-UKA002',
      expect.any(Array),
      expect.any(Object)
    )
  })

  test('Should skip the currently selected station when re-plotting all markers', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    mapClickCallback({ coords: [-0.1, 51.5] })
    mockMapInstance.addMarker.mockClear()
    mockMapInstance.removeMarker.mockClear()
    // Switch tab triggers onFilterChange → plotAllMarkers
    document.getElementById('filter-tab-other').click()
    // UKA001 is the selected marker — plotAllMarkers must skip it entirely
    expect(mockMapInstance.addMarker).not.toHaveBeenCalledWith(
      'ms-UKA001',
      expect.any(Array),
      expect.any(Object)
    )
    expect(mockMapInstance.removeMarker).not.toHaveBeenCalledWith('ms-UKA001')
  })

  test('Should sort two stations at the same latitude by DAQI', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        location: { coordinates: [51.5, -0.1] },
        pollutants: ['NO2']
      },
      {
        localSiteID: 'UKA002',
        location: { coordinates: [51.5, -0.2] },
        pollutants: ['O3']
      }
    ]
    await loadAndIdleWithFilter({ stations })
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA001',
      expect.any(Array),
      expect.any(Object)
    )
    expect(mockMapInstance.addMarker).toHaveBeenCalledWith(
      'ms-UKA002',
      expect.any(Array),
      expect.any(Object)
    )
  })

  test('Should do nothing when filter panel element is not in DOM', async () => {
    resetDom()
    document.getElementById('filter-panel').remove()
    stubFetch()
    jest.resetModules()
    await importMap()
    expect(() => mapReadyCallback()).not.toThrow()
  })

  test('Should handle tab clicks when content divs are not in DOM', async () => {
    resetDom()
    document.getElementById('filter-daqi-content').remove()
    document.getElementById('filter-other-content').remove()
    stubFetch()
    jest.resetModules()
    await importMap()
    mapReadyCallback()
    expect(() =>
      document.getElementById('filter-tab-other').click()
    ).not.toThrow()
    expect(() =>
      document.getElementById('filter-tab-daqi').click()
    ).not.toThrow()
  })

  test('Should not bind scroll listener when scroll container is not in DOM', async () => {
    resetDom()
    document.querySelector('.aq-filter-panel__scroll').remove()
    stubFetch()
    jest.resetModules()
    await importMap()
    expect(() => mapReadyCallback()).not.toThrow()
  })
})

// Behaviour is unit tested in map-panels.test.js and map-zoom-controls.test.js.
// These check that map.js wires them up.
describe('#map panels and zoom controls', () => {
  const station = {
    localSiteID: 'UKA001',
    name: 'London Test',
    stationStatus: 'current',
    pollutants: ['NO2'],
    location: { coordinates: [51.5, -0.1] }
  }

  function byId(id) {
    return document.getElementById(id)
  }

  function stubMobileView() {
    stubGlobal(
      'matchMedia',
      jest.fn(() => ({ matches: true, addEventListener: jest.fn() }))
    )
  }

  function mapReady(maplibreMap) {
    const [, onMapReady] = mockMapInstance.on.mock.calls.find(
      ([event]) => event === 'map:ready'
    )
    onMapReady({ map: maplibreMap })
  }

  afterEach(() => {
    delete globalThis.matchMedia
  })

  test('Should turn off the built-in zoom buttons and map controls in favour of the page controls', () => {
    expect(InteractiveMap).toHaveBeenCalledWith(
      'map',
      expect.objectContaining({
        enableZoomControls: false,
        enableMapControls: false
      })
    )
  })

  test('Should zoom the map in when the zoom in button is clicked once the map is ready', () => {
    const maplibreMap = {
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      getZoom: jest.fn(() => 6),
      getMinZoom: jest.fn(() => 0),
      getMaxZoom: jest.fn(() => 16),
      on: jest.fn()
    }
    mapReady(maplibreMap)
    byId('zoom-in').click()
    expect(maplibreMap.zoomIn).toHaveBeenCalledTimes(1)
  })

  test('Should start with the map key open on a larger screen', async () => {
    await loadStationsAndIdle([station])
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('key-button').hidden).toBe(true)
  })

  test('Should start with the map key closed on mobile', async () => {
    stubMobileView()
    await loadStationsAndIdle([station])
    expect(byId('map-key-overlay').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should close the station panel when the Key button is clicked on mobile', async () => {
    stubMobileView()
    await loadStationsAndIdle([station])
    mapClickCallback({ coords: [-0.1, 51.5] })
    byId('key-button').click()
    expect(byId('station-panel').classList.contains('visible')).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(false)
  })
})

describe('#map view state', () => {
  const station = {
    localSiteID: 'UKA001',
    name: 'London Test',
    stationStatus: 'current',
    pollutants: ['NO2'],
    location: { coordinates: [51.5, -0.1] }
  }
  const STORAGE_KEY = 'aqie-map-view-state'

  async function loadWithSavedView(state) {
    resetDom()
    stubFetch({ stations: [station] })
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), state })
    )
    jest.resetModules()
    await importMap()
    mapReadyCallback()
  }

  afterEach(() => {
    sessionStorage.clear()
  })

  test('Should open at the saved zoom and position', async () => {
    await loadWithSavedView({ zoom: 11, center: [-0.1, 51.5] })
    expect(InteractiveMap).toHaveBeenLastCalledWith(
      'map',
      expect.objectContaining({ zoom: 11, center: [-0.1, 51.5] })
    )
  })

  test('Should open at the default view when nothing was saved', async () => {
    await loadWithSavedView(null)
    expect(InteractiveMap).toHaveBeenLastCalledWith(
      'map',
      expect.objectContaining({
        zoom: defaultZoom,
        center: [ukCentreLng, ukCentreLat]
      })
    )
  })

  test('Should restore the saved filters', async () => {
    await loadWithSavedView({
      filters: { mode: 'daqi', mapMode: 'aurn', selected: ['O3'] }
    })
    const { filterState } = await import('./map-filter-panel.js')
    expect([...filterState.selected]).toEqual(['O3'])
    expect(document.getElementById('filter-pollutant-3').checked).toBe(false)
    // The only station monitors NO2, so it no longer matches the filter
    expect(mockMapInstance.addMarker).not.toHaveBeenCalled()
  })

  test('Should reopen the station that was selected', async () => {
    await loadWithSavedView({ selectedStationId: 'ms-UKA001' })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(true)
    expect(document.getElementById('sp-name').textContent).toContain(
      'London Test'
    )
  })

  test('Should ignore a saved station that no longer exists', async () => {
    await loadWithSavedView({ selectedStationId: 'ms-GONE' })
    expect(
      document.getElementById('station-panel').classList.contains('visible')
    ).toBe(false)
  })

  test('Should not restore the same view on a second visit', async () => {
    await loadWithSavedView({ zoom: 11 })
    await loadWithSavedView(null)
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(InteractiveMap).toHaveBeenLastCalledWith(
      'map',
      expect.objectContaining({ zoom: defaultZoom })
    )
  })

  test('Should save the current view when the station summary link is clicked', async () => {
    await loadWithSavedView(null)
    // The mock instance is shared with the import from beforeEach, so use the latest listener
    const [, onMapReady] = mockMapInstance.on.mock.calls
      .filter(([event]) => event === 'map:ready')
      .at(-1)
    onMapReady({
      map: {
        getZoom: () => 8.25,
        getMaxZoom: () => 16,
        getMinZoom: () => 0,
        getCenter: () => ({ lng: -1.5, lat: 52.1 }),
        on: jest.fn()
      }
    })
    mapClickCallback({ coords: [-0.1, 51.5] })
    jest
      .spyOn(document.getElementById('sp-station-form'), 'submit')
      .mockImplementation(() => undefined)
    document.getElementById('sp-station-link').click()

    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)).state
    expect(saved).toMatchObject({
      zoom: 8.25,
      center: [-1.5, 52.1],
      selectedStationId: 'ms-UKA001',
      filters: { mode: 'daqi', mapMode: 'aurn' }
    })
    expect(saved.filters.selected).toEqual(
      expect.arrayContaining(['NO2', 'O3', 'SO2', 'PM25', 'PM10'])
    )
  })
})
