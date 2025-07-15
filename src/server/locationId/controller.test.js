import { getLocationDetailsController } from './controller'
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

  //  it('should handle API error gracefully', async () => {
  //   const mockLocation = {
  //     GAZETTEER_ENTRY: {
  //       ID: 'loc123',
  //       NAME1: 'TestLocation'
  //     }
  //   }

  //   const mockError = new Error('API failed')

  //   request.yar.get.mockImplementation((key) => {
  //     const session = {
  //       osnameapiresult: { getOSPlaces: [mockLocation] },
  //       fullSearchQuery: { value: 'query' },
  //       locationMiles: 5
  //     }
  //     return session[key]
  //   })

  //   axios.get.mockRejectedValue(mockError)

  //   const result = await getLocationDetailsController.handler(request, h)

  //   expect(request.yar.set).toHaveBeenCalledWith('MonitoringstResult', mockError)
  //   expect(result).toBe(mockError)
  // })
})
