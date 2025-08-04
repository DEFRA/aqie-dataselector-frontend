import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js'
import axios from 'axios'

jest.mock('axios')

describe('multipleLocationsController.handler', () => {
  let h, request

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis()
    }

    request = {
      query: {
        fullSearchQuery: 'TestLocation',
        locationMiles: '5',
        searchQuery: 'TestLocation'
      },
      yar: {
        get: jest.fn((key) => {
          if (key === 'searchLocation') return 'TestLocation'
          if (key === 'osnameapiresult') return null
          return null
        }),
        set: jest.fn()
      }
    }

    jest.clearAllMocks()
  })

  it('should render monitoring-station view for single location with stations', async () => {
    const mockLocation = {
      getOSPlaces: [
        { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' } }
      ]
    }
    const mockMonitoring = {
      getmonitoringstation: [
        {
          name: 'Station A',
          pollutants: { PM25: {}, NO2: {} }
        }
      ]
    }

    request.yar.get.mockImplementation((key) => {
      if (key === 'searchLocation') return 'TestLocation'
      if (key === 'osnameapiresult')
        return { getOSPlaces: mockLocation.getOSPlaces }
      return null
    })

    axios.post.mockResolvedValueOnce({ data: mockLocation })
    axios.post.mockResolvedValueOnce({ data: mockMonitoring })

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        searchLocation: 'TestLocation',
        locationMiles: '5',
        monitoring_station: mockMonitoring.getmonitoringstation,
        displayBacklink: true,
        hrefq: '/search-location'
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should render nostation view for single location with no stations', async () => {
    const mockLocation = {
      getOSPlaces: [
        { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'TestLocation' } }
      ]
    }
    const mockMonitoring = { getmonitoringstation: [] }

    request.yar.get.mockImplementation((key) => {
      if (key === 'searchLocation') return 'TestLocation'
      if (key === 'osnameapiresult')
        return { getOSPlaces: mockLocation.getOSPlaces }
      return null
    })

    axios.post.mockResolvedValueOnce({ data: mockLocation })
    axios.post.mockResolvedValueOnce({ data: mockMonitoring })

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nostation',
      expect.objectContaining({
        searchLocation: 'TestLocation',
        locationMiles: '5',
        displayBacklink: true,
        hrefq: '/search-location'
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should render multiplelocations view when multiple locations are found', async () => {
    const mockLocation = {
      getOSPlaces: [
        { GAZETTEER_ENTRY: { ID: 'loc123', NAME1: 'Location1' } },
        { GAZETTEER_ENTRY: { ID: 'loc456', NAME1: 'Location2' } }
      ]
    }
    const mockMonitoring = {
      getmonitoringstation: [
        {
          name: 'Station A',
          pollutants: { NO2: {}, MP10: {} }
        }
      ]
    }

    request.yar.get.mockImplementation((key) => {
      if (key === 'searchLocation') return 'TestLocation'
      if (key === 'osnameapiresult')
        return { getOSPlaces: mockLocation.getOSPlaces }
      return null
    })

    axios.post.mockResolvedValueOnce({ data: mockLocation })
    axios.post.mockResolvedValueOnce({ data: mockMonitoring })

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/index',
      expect.objectContaining({
        results: mockLocation.getOSPlaces,
        monitoring_station: mockMonitoring.getmonitoringstation,
        searchLocation: 'TestLocation',
        locationMiles: '5',
        displayBacklink: true,
        hrefq: '/search-location'
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should render nolocation view when no locations are found', async () => {
    const mockLocation = { getOSPlaces: [] }

    request.yar.get.mockImplementation((key) => {
      if (key === 'searchLocation') return 'TestLocation'
      if (key === 'osnameapiresult')
        return { getOSPlaces: mockLocation.getOSPlaces }
      return null
    })

    axios.post.mockResolvedValueOnce({ data: mockLocation })

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nolocation',
      expect.objectContaining({
        results: [],
        searchLocation: 'TestLocation',
        displayBacklink: true,
        hrefq: '/search-location'
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should render search-location view with error when query is missing', async () => {
    request.query.fullSearchQuery = ''
    request.query.searchQuery = ''
    request.query.locationMiles = ''

    request.yar.get.mockReturnValueOnce(undefined)

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.objectContaining({
        fullSearchQuery: '',
        displayBacklink: true,
        hrefq: '/'
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API failed')

    request.yar.get.mockImplementation((key) => {
      if (key === 'searchLocation') return 'TestLocation'
      if (key === 'osnameapiresult') return { getOSPlaces: [] }
      return null
    })

    axios.post.mockRejectedValue(mockError)

    const result = await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
    expect(result).toBe(h.view.mock.results[0].value)
  })
})
