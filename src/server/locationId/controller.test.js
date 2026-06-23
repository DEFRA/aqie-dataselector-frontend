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
      view: jest.fn().mockReturnThis(),
      response: jest.fn().mockImplementation(() => ({
        code: jest.fn().mockReturnValue('error-response')
      })),
      code: jest.fn().mockReturnThis()
    }

    request = {
      method: 'post',
      params: { id: 'loc123' },
      payload: { locationId: 'loc123' },
      headers: {
        referer: 'http://localhost:3001/multiplelocations'
      },
      info: {
        host: 'localhost:3001'
      },
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

    axios.post.mockResolvedValue({ data: mockMonitoringData })

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
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: undefined,
        fullSearchQuery: { value: 'query' },
        locationMiles: 5,
        locationID: 'loc123'
      }
      return session[key]
    })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Invalid request')
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should return undefined if locationID is missing', async () => {
    request.payload = {}
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5,
        locationID: undefined
      }
      return session[key]
    })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Location not found')
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should return undefined if user location is not found', async () => {
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5,
        locationID: 'loc123'
      }
      return session[key]
    })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Location not found')
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

    axios.post.mockResolvedValue({ data: mockMonitoringData })

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

  it('should resolve locationID from POST payload (noJS form submission)', async () => {
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

    request.method = 'post'
    request.payload = { locationId: 'loc123' }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('locationID', 'loc123')
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'TestLocation'
      })
    )
  })

  it('returns a 404 page when accessed without internal navigation', async () => {
    request.headers = {}
    request.info = { host: 'localhost:3001' }

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'error/index',
      expect.objectContaining({ statusCode: '404' })
    )
    expect(h.code).toHaveBeenCalledWith(404)
  })

  it('returns a server error when the monitoring stations API returns null', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })
    axios.post.mockResolvedValue({ data: null })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(
      'Error retrieving monitoring stations'
    )
  })

  it('should handle axios rejection gracefully', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5
      }
      return session[key]
    })

    axios.post.mockRejectedValue(new Error('Network error'))

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(
      'Error retrieving monitoring stations'
    )
  })

  it('should resolve locationID from session on GET when params.id is undefined', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station A', pollutants: { NO2: {} } }]
    }

    request.method = 'get'
    request.payload = undefined
    request.params = {}

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 10,
        locationID: 'loc123'
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(request.yar.get).toHaveBeenCalledWith('locationID')
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'TestLocation'
      })
    )
  })

  it('should resolve locationID from params.id on GET and store it in session', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc789', NAME1: 'Bristol' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station A', pollutants: { NO2: {} } }]
    }

    request.method = 'get'
    request.payload = undefined
    request.params = { id: 'loc789' }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 10
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('locationID', 'loc789')
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'Bristol'
      })
    )
  })

  it('should fall back to params.id on POST when payload.locationId is absent', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station A', pollutants: { NO2: {} } }]
    }

    request.method = 'post'
    request.payload = {}
    request.params = { id: 'loc123' }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 10
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('locationID', 'loc123')
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'TestLocation'
      })
    )
  })

  it('should return Invalid request on GET when neither params.id nor session locationID exist', async () => {
    request.method = 'get'
    request.payload = undefined
    request.params = {}

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5,
        locationID: undefined
      }
      return session[key]
    })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Invalid request')
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should handle multiple locations in osnameapiresult and find correct one', async () => {
    const mockLocations = [
      { GAZETTEER_ENTRY: { ID: 'loc111', NAME1: 'London' } },
      { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'Manchester' } },
      { GAZETTEER_ENTRY: { ID: 'loc456', NAME1: 'Birmingham' } }
    ]
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station X', pollutants: { SO2: {} } }]
    }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: mockLocations },
        fullSearchQuery: { value: 'Manchester' },
        locationMiles: 5
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'Manchester'
      })
    )
  })

  it('should handle monitoring data with multiple stations', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [
        { name: 'Station A', pollutants: { PM25: {}, NO2: {} } },
        { name: 'Station B', pollutants: { O3: {}, SO2: {} } },
        { name: 'Station C', pollutants: { GR10: {} } }
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

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        monitoring_station: mockMonitoringData.getmonitoringstation
      })
    )
  })

  it('should use params.id when payload is null', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station A', pollutants: { NO2: {} } }]
    }

    request.payload = null
    request.params = { id: 'loc123' }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'query' },
        locationMiles: 10,
        locationID: 'loc123'
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
  })

  it('should return Invalid request when getOSPlaces is undefined', async () => {
    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: undefined },
        fullSearchQuery: { value: 'query' },
        locationMiles: 5,
        locationID: 'loc123'
      }
      return session[key]
    })

    await getLocationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalled()
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should set locationID in session from payload', async () => {
    const mockLocation = {
      GAZETTEER_ENTRY: { ID: 'loc456', NAME1: 'Leeds' }
    }
    const mockMonitoringData = {
      getmonitoringstation: [{ name: 'Station Z', pollutants: { NO2: {} } }]
    }

    request.payload = { locationId: 'loc456' }
    request.params = { id: 'loc456' }

    request.yar.get.mockImplementation((key) => {
      const session = {
        osnameapiresult: { getOSPlaces: [mockLocation] },
        fullSearchQuery: { value: 'Leeds' },
        locationMiles: 3
      }
      return session[key]
    })

    axios.post.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('locationID', 'loc456')
  })
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

  it('should return empty string when locations is an empty array', () => {
    expect(findUserLocation([], 'loc123')).toBe('')
  })

  it('should return empty string when locationId is null', () => {
    const locations = [{ GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } }]
    expect(findUserLocation(locations, null)).toBe('')
  })

  it('should return empty string when locationId is undefined', () => {
    const locations = [{ GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } }]
    expect(findUserLocation(locations, undefined)).toBe('')
  })

  it('should return first matching location when duplicates exist', () => {
    const locations = [
      { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } },
      { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London City' } }
    ]
    const result = findUserLocation(locations, 'loc123')
    expect(result).toBe('London')
  })

  it('should handle locations with missing GAZETTEER_ENTRY gracefully', () => {
    const locations = [
      { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'London' } },
      { GAZETTEER_ENTRY: { ID: 'loc789', NAME1: 'Bristol' } },
      { GAZETTEER_ENTRY: { ID: 'loc456', NAME1: 'Manchester' } }
    ]
    const result = findUserLocation(locations, 'loc456')
    expect(result).toBe('Manchester')
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

    it('should deduplicate PM2.5 when both PM25 and GR25 are present', () => {
      const stations = [
        {
          name: 'Station D',
          pollutants: { PM25: {}, GR25: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station D')).toEqual(['PM2.5'])
    })

    it('should deduplicate PM10 when MP10, GE10, and GR10 are all present', () => {
      const stations = [
        {
          name: 'Station E',
          pollutants: { MP10: {}, GE10: {}, GR10: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station E')).toEqual(['PM10'])
    })

    it('should handle GR10 as PM10', () => {
      const stations = [
        {
          name: 'Station F',
          pollutants: { GR10: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station F')).toEqual(['PM10'])
    })

    it('should handle GE10 as PM10', () => {
      const stations = [
        {
          name: 'Station G',
          pollutants: { GE10: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station G')).toEqual(['PM10'])
    })

    it('should handle MP10 as PM10', () => {
      const stations = [
        {
          name: 'Station H',
          pollutants: { MP10: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station H')).toEqual(['PM10'])
    })

    it('should handle GR25 as PM2.5', () => {
      const stations = [
        {
          name: 'Station I',
          pollutants: { GR25: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station I')).toEqual(['PM2.5'])
    })

    it('should keep non-mapped pollutants as-is', () => {
      const stations = [
        {
          name: 'Station J',
          pollutants: { NO2: {}, SO2: {}, O3: {} }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station J')).toEqual(
        expect.arrayContaining(['NO2', 'SO2', 'O3'])
      )
      expect(result.get('Station J')).toHaveLength(3)
    })

    it('should handle multiple stations correctly', () => {
      const stations = [
        { name: 'Station K', pollutants: { NO2: {}, SO2: {} } },
        { name: 'Station L', pollutants: { O3: {} } },
        { name: 'Station M', pollutants: { PM25: {}, GR10: {} } }
      ]
      const result = buildPollutantMap(stations)
      expect(result.size).toBe(3)
      expect(result.get('Station K')).toEqual(
        expect.arrayContaining(['NO2', 'SO2'])
      )
      expect(result.get('Station L')).toEqual(['O3'])
      expect(result.get('Station M')).toEqual(
        expect.arrayContaining(['PM2.5', 'PM10'])
      )
    })

    it('should return an empty map for empty array', () => {
      const result = buildPollutantMap([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should return an empty map for undefined input', () => {
      const result = buildPollutantMap(undefined)
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should handle a station with all known pollutant types', () => {
      const stations = [
        {
          name: 'Station N',
          pollutants: {
            PM25: {},
            GR25: {},
            MP10: {},
            GE10: {},
            GR10: {},
            NO2: {},
            SO2: {},
            O3: {}
          }
        }
      ]
      const result = buildPollutantMap(stations)
      expect(result.get('Station N')).toEqual(
        expect.arrayContaining(['PM2.5', 'PM10', 'NO2', 'SO2', 'O3'])
      )
      expect(result.get('Station N')).toHaveLength(5)
    })
  })
})
