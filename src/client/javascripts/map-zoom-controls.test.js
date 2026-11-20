/**
 * @jest-environment jsdom
 */
import { initZoomControls } from './map-zoom-controls.js'

const MIN_ZOOM = 0
const MAX_ZOOM = 16
const MID_ZOOM = 6

function buildDom() {
  document.body.innerHTML = `
    <button id="zoom-in" type="button"></button>
    <button id="zoom-out" type="button"></button>
  `
}

function createMaplibreMap(overrides = {}) {
  return {
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    getZoom: jest.fn(() => MID_ZOOM),
    getMinZoom: jest.fn(() => MIN_ZOOM),
    getMaxZoom: jest.fn(() => MAX_ZOOM),
    on: jest.fn(),
    ...overrides
  }
}

describe('#initZoomControls', () => {
  beforeEach(() => {
    buildDom()
  })

  test('Should zoom the map in when the zoom in button is clicked', () => {
    const maplibreMap = createMaplibreMap()
    initZoomControls(maplibreMap)
    document.getElementById('zoom-in').click()
    expect(maplibreMap.zoomIn).toHaveBeenCalledTimes(1)
    expect(maplibreMap.zoomOut).not.toHaveBeenCalled()
  })

  test('Should zoom the map out when the zoom out button is clicked', () => {
    const maplibreMap = createMaplibreMap()
    initZoomControls(maplibreMap)
    document.getElementById('zoom-out').click()
    expect(maplibreMap.zoomOut).toHaveBeenCalledTimes(1)
    expect(maplibreMap.zoomIn).not.toHaveBeenCalled()
  })

  test('Should leave both buttons enabled between the zoom limits', () => {
    initZoomControls(createMaplibreMap())
    expect(document.getElementById('zoom-in').disabled).toBe(false)
    expect(document.getElementById('zoom-out').disabled).toBe(false)
  })

  test('Should disable zoom in at the maximum zoom', () => {
    initZoomControls(createMaplibreMap({ getZoom: jest.fn(() => MAX_ZOOM) }))
    expect(document.getElementById('zoom-in').disabled).toBe(true)
    expect(document.getElementById('zoom-out').disabled).toBe(false)
  })

  test('Should disable zoom out at the minimum zoom', () => {
    initZoomControls(createMaplibreMap({ getZoom: jest.fn(() => MIN_ZOOM) }))
    expect(document.getElementById('zoom-out').disabled).toBe(true)
    expect(document.getElementById('zoom-in').disabled).toBe(false)
  })

  test('Should listen for zoom changes on the map', () => {
    const maplibreMap = createMaplibreMap()
    initZoomControls(maplibreMap)
    expect(maplibreMap.on).toHaveBeenCalledWith('zoom', expect.any(Function))
  })

  test('Should update which buttons are disabled when the map zoom changes', () => {
    const maplibreMap = createMaplibreMap()
    initZoomControls(maplibreMap)
    const [, onZoom] = maplibreMap.on.mock.calls[0]

    maplibreMap.getZoom.mockReturnValue(MAX_ZOOM)
    onZoom()
    expect(document.getElementById('zoom-in').disabled).toBe(true)

    maplibreMap.getZoom.mockReturnValue(MID_ZOOM)
    onZoom()
    expect(document.getElementById('zoom-in').disabled).toBe(false)
  })

  test('Should do nothing when the map is not provided', () => {
    expect(() => initZoomControls(undefined)).not.toThrow()
    expect(document.getElementById('zoom-in').disabled).toBe(false)
    expect(document.getElementById('zoom-out').disabled).toBe(false)
  })

  test('Should do nothing when the zoom in button is not in the DOM', () => {
    const maplibreMap = createMaplibreMap()
    document.getElementById('zoom-in').remove()
    expect(() => initZoomControls(maplibreMap)).not.toThrow()
    expect(maplibreMap.on).not.toHaveBeenCalled()
  })

  test('Should do nothing when the zoom out button is not in the DOM', () => {
    const maplibreMap = createMaplibreMap()
    document.getElementById('zoom-out').remove()
    expect(() => initZoomControls(maplibreMap)).not.toThrow()
    expect(maplibreMap.on).not.toHaveBeenCalled()
  })
})
