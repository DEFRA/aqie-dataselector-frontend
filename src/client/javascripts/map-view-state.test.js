/**
 * @jest-environment jsdom
 */
import {
  saveMapViewState,
  restoreMapViewState,
  readNearbyStationsView
} from './map-view-state.js'

const STORAGE_KEY = 'aqie-map-view-state'

const validState = {
  zoom: 9.5,
  center: [-2.2, 53.5],
  filters: { mode: 'daqi', mapMode: 'forecast', selected: ['NO2', 'O3'] },
  forecastDay: 'Wed',
  selectedStationId: 'ms-UKA001'
}

function storeRaw(value) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

describe('map-view-state', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  test('Should restore exactly what was saved', () => {
    saveMapViewState(validState)
    expect(restoreMapViewState()).toEqual(validState)
  })

  test('Should only restore the view once', () => {
    saveMapViewState(validState)
    restoreMapViewState()
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should return null when nothing was saved', () => {
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should return null for content that is not valid JSON', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not json')
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should ignore a saved view that has expired', () => {
    jest.useFakeTimers()
    saveMapViewState(validState)
    jest.advanceTimersByTime(31 * 60 * 1000)
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should ignore a saved view with no timestamp', () => {
    storeRaw({ state: validState })
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should drop out-of-range and wrongly typed fields but keep the valid ones', () => {
    storeRaw({
      savedAt: Date.now(),
      state: {
        zoom: 99,
        center: [-2.2, 'north'],
        filters: {
          mode: 'bogus',
          mapMode: 'aurn',
          selected: ['NO2', '<script>', 'PM10']
        },
        forecastDay: 'Someday',
        selectedStationId: 'ms-UKA001'
      }
    })
    expect(restoreMapViewState()).toEqual({
      filters: { mapMode: 'aurn', selected: ['NO2', 'PM10'] },
      selectedStationId: 'ms-UKA001'
    })
  })

  test.each([
    ['a missing prefix', 'UKA001'],
    ['a non-string', 42],
    ['an over-long value', `ms-${'a'.repeat(200)}`]
  ])('Should reject a station id with %s', (_label, selectedStationId) => {
    storeRaw({ savedAt: Date.now(), state: { zoom: 5, selectedStationId } })
    expect(restoreMapViewState()).toEqual({ zoom: 5 })
  })

  test('Should return null when no field survives validation', () => {
    storeRaw({ savedAt: Date.now(), state: { zoom: -1, center: [500, 500] } })
    expect(restoreMapViewState()).toBeNull()
  })

  test('Should not throw when storage is blocked while saving', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveMapViewState(validState)).not.toThrow()
  })

  test('Should return null when storage is blocked while restoring', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(restoreMapViewState()).toBeNull()
  })
})

describe('readNearbyStationsView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  function renderMap(nearbyStationsView) {
    const map = document.createElement('div')
    map.id = 'map'
    if (nearbyStationsView !== undefined) {
      map.dataset.nearbyStationsView = nearbyStationsView
    }
    document.body.appendChild(map)
  }

  test('Should return null when the page was not opened from nearby stations', () => {
    renderMap()
    expect(readNearbyStationsView()).toBeNull()
  })

  test('Should return the sanitised nearby stations view and reset the URL to /map', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState')
    renderMap(
      JSON.stringify({
        center: [-1.875, 52.476],
        zoom: 11,
        selectedStationId: 'ms-BIRR',
        unexpected: 'x'
      })
    )

    expect(readNearbyStationsView()).toEqual({
      center: [-1.875, 52.476],
      zoom: 11,
      selectedStationId: 'ms-BIRR'
    })
    expect(replaceState).toHaveBeenCalledWith(null, '', '/map')
  })

  test('Should return null for malformed JSON', () => {
    renderMap('{not json')
    expect(readNearbyStationsView()).toBeNull()
  })
})
