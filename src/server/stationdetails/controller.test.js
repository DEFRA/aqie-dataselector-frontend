import { stationDetailsController } from './controller.js'
import axios from 'axios'

jest.mock('axios')

global.apiparams = { some: 'value' }

describe('stationDetailsController.handler', () => {
  let h, request

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis(),
      response: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'urban',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2', 'PM10']
    }

    request = {
      params: {
        id: 'site123'
      },
      yar: {
        get: jest.fn((key) => {
          const session = {
            MonitoringstResult: { getmonitoringstation: [station] },
            stationdetails: station,
            selectedYear: 2024,
            latesttime: '2024-07-15',
            downloadresult: { result: 'downloaded' },
            fullSearchQuery: { value: 'mockFullSearchQuery' },
            locationMiles: 10,
            locationID: 'mockLocationID',
            nooflocation: 'multiple'
          }
          return session[key]
        }),
        set: jest.fn()
      }
    }

    jest.clearAllMocks()
  })

  it('should render the view for non-download requests', async () => {
    request.params.download = undefined

    const result = await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        pageTitle: 'Stations summary details',
        title: expect.any(Object),
        serviceName: 'Get air pollution data',
        stationdetails: expect.any(Object),
        maplocation: expect.stringContaining(
          'https://www.google.co.uk/maps?q='
        ),
        updatedTime: expect.any(String),
        displayBacklink: true,
        fullSearchQuery: 'mockFullSearchQuery',
        apiparams: expect.any(Object),
        years: expect.any(Array),
        currentdate: expect.any(String),
        pollutantKeys: ['NO2', 'PM10'],
        selectedYear: 2024,
        downloadresult: { result: 'downloaded' },
        hrefq: expect.stringContaining('/location/')
      })
    )

    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should handle download requests and set downloadresult', async () => {
    request.params.download = 2024
    request.params.pollutant = 'NO2'
    request.params.frequency = 'hourly'

    axios.post.mockResolvedValue({ data: { result: 'downloaded' } })

    const result = await stationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('downloadresult', {
      result: 'downloaded'
    })

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        downloadresult: { result: 'downloaded' }
      })
    )

    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should handle Invokedownload error gracefully', async () => {
    request.params.download = 2024
    request.params.pollutant = 'NO2'
    request.params.frequency = 'hourly'

    axios.post.mockRejectedValue(new Error('fail'))

    const result = await stationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Failed to download data')
    expect(h.code).toHaveBeenCalledWith(500)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should return 400 if request is null', async () => {
    const result = await stationDetailsController.handler(null, h)

    expect(h.response).toHaveBeenCalledWith('Invalid request')
    expect(h.code).toHaveBeenCalledWith(400)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should return 404 if monitoring result is missing', async () => {
    request.yar.get = jest.fn((key) => {
      const session = {
        stationdetails: {},
        selectedYear: 2024
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Monitoring result not found')
    expect(h.code).toHaveBeenCalledWith(404)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should return 500 if monitoring result is not an array', async () => {
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: 'not-an-array' }
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Invalid monitoring data format')
    expect(h.code).toHaveBeenCalledWith(500)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should return 404 if station is not found in monitoring result', async () => {
    request.params.id = 'nonexistent'
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: {
          getmonitoringstation: [{ id: 'site123' }]
        }
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Station not found')
    expect(h.code).toHaveBeenCalledWith(404)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should render single location view when nooflocation is single', async () => {
    request.yar.get = jest.fn((key) => {
      const station = {
        id: 'site123',
        region: 'region1',
        siteType: 'urban',
        name: 'StationName',
        location: { coordinates: [1.23, 4.56] },
        pollutants: ['NO2', 'PM10'],
        updated: '2025-07-15T00:00:00Z'
      }

      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        latesttime: '2024-07-15',
        downloadresult: { result: 'downloaded' },
        fullSearchQuery: { value: 'mockFullSearchQuery' },
        locationMiles: 10,
        locationID: 'mockLocationID',
        nooflocation: 'single'
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        hrefq: expect.stringContaining('/multiplelocations')
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })
})
