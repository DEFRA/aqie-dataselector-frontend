import { stationDetailsController } from './controller'
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

    expect(request.yar.set).toHaveBeenCalledWith(
      'downloadresult',
      expect.any(Error)
    )
    expect(h.view).toHaveBeenCalled()
    expect(result).toBe(h.view.mock.results[0].value)
  })
})
