import {
  getLocationDetailsController,
  findUserLocation,
  buildPollutantMap
} from '~/src/server/locationId/controller.js'

import axios from 'axios'

jest.mock('axios')

describe('getLocationDetailsController.handler', () => {
  let h, request

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis()
    }

    request = {
      params: { id: 'loc123' },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    jest.clearAllMocks()
  })

  it('should render monitoring station view when data is valid', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: {
        ID: 'loc123',
        NAME1: 'TestLocation'
      }
    }

    const mockMonitoringData = {
      getmonitoringstation: [
        {
          name: 'Station A',
          pollutants: { PM25: {}, NO2: {} }
        }
      ]
    }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })

    axios.get.mockResolvedValue({ data: mockMonitoringData })

    const result = await getLocationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith(
      'MonitoringstResult',
      mockMonitoringData
    )
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'TestLocation',
        locationMiles: 5,
        monitoring_station: mockMonitoringData.getmonitoringstation,
        fullSearchQuery: 'query',
        displayBacklink: true
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should return undefined if osnameapiresult is missing', async () => {
    request.yar.get.mockReturnValueOnce(undefined)

    const result = await getLocationDetailsController.handler(request, h)

    expect(result).toBeUndefined()
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should return undefined if locationID is missing', async () => {
    request.params.id = undefined
    request.yar.get.mockReturnValue({ getOSPlaces: [] })

    const result = await getLocationDetailsController.handler(request, h)

    expect(result).toBeUndefined()
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should return undefined if user location is not found', async () => {
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })

    const result = await getLocationDetailsController.handler(request, h)

    expect(result).toBeUndefined()
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should render no station view if no monitoring stations found', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: {
        ID: 'loc123',
        NAME1: 'TestLocation'
      }
    }

    const mockMonitoringData = {
      getmonitoringstation: []
    }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })

    axios.get.mockResolvedValue({ data: mockMonitoringData })

    const result = await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nostation',
      expect.objectContaining({
        searchLocation: 'TestLocation',
        locationMiles: 5,
        displayBacklink: true
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  describe('findUserLocation', () => {
    it('should return the location name when ID matches', () => {
      const locations = [
        { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } },
        { GAZETTEER_ENTRY: { ID: 'loc456', NAME1: 'Manchester' } }
      ]
      const result = findUserLocation(locations, 'loc456')
      expect(result).toBe('Manchester')
    })

    it('should return empty string when ID does not match', () => {
      const locations = [{ GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } }]
      const result = findUserLocation(locations, 'loc999')
      expect(result).toBe('')
    })

    it('should return empty string when locations is null or undefined', () => {
      expect(findUserLocation(null, 'loc123')).toBe('')
      expect(findUserLocation(undefined, 'loc123')).toBe('')
    })
  })
})

describe('buildPollutantMap', () => {
  it('should return a map with correct pollutant names', () => {
    const stations = [
      {
        name: 'Station A',
        pollutants: { PM25: {}, MP10: {}, NO2: {} }
      },
      {
        name: 'Station B',
        pollutants: { GR25: {}, GE10: {} }
      }
    ]
    const result = buildPollutantMap(stations)

    expect(result.get('Station A')).toEqual(
      expect.arrayContaining(['PM2.5', 'PM10', 'NO2'])
    )
    expect(result.get('Station B')).toEqual(
      expect.arrayContaining(['PM2.5', 'PM10'])
    )
  })

  it('should return an empty map if input is not an array', () => {
    const result = buildPollutantMap(null)
    expect(result instanceof Map).toBe(true)
    expect(result.size).toBe(0)
  })

  it('should handle stations with no pollutants', () => {
    const stations = [
      {
        name: 'Station C',
        pollutants: {}
      }
    ]
    const result = buildPollutantMap(stations)
    expect(result.get('Station C')).toEqual([])
  })
})
