// __tests__/stationDetailsController.test.js
import { stationDetailsController } from '~/src/server/stationdetails/controller.js'
import axios from 'axios'

jest.mock('axios')

describe('stationDetailsController.handler', () => {
  let request, h

  beforeEach(() => {
    const mockStation = {
      id: 'station123',
      region: 'RegionX',
      siteType: 'Urban',
      name: 'Station Name',
      localSiteID: 'LOC123',
      location: {
        coordinates: [51.5, -0.1]
      },
      updated: '2025-07-06T12:00:00Z',
      pollutants: ['NO2', 'PM10']
    }

    request = {
      params: {
        id: 'station123',
        download: '2024',
        pollutant: 'NO2',
        frequency: 'hourly'
      },
      yar: {
        get: jest.fn((key) => {
          const mockData = {
            MonitoringstResult: {
              getmonitoringstation: [mockStation]
            },
            stationdetails: mockStation,
            selectedYear: '2024',
            downloadPollutant: 'NO2',
            downloadFrequency: 'hourly',
            fullSearchQuery: { value: 'London' },
            locationMiles: '10',
            locationID: 'loc123',
            nooflocation: 'multiple'
          }
          return mockData[key]
        }),
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn()
    }
  })

  it('should render the stationdetails view with download result', async () => {
    axios.post.mockResolvedValue({ data: 'mockDownloadData' })

    await stationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith(
      'downloadresult',
      'mockDownloadData'
    )
  })

  it('should handle missing monitoring result gracefully', async () => {
    request.yar.get = jest.fn((key) => {
      if (key === 'MonitoringstResult') return null
      return undefined
    })

    const result = await stationDetailsController.handler(request, h)
    expect(result).toBeUndefined()
    expect(h.view).not.toHaveBeenCalled()
  })

  it('should render view with single location href if nooflocation is single', async () => {
    request.yar.get = jest.fn((key) => {
      const mockStation = {
        id: 'station123',
        region: 'RegionX',
        siteType: 'Urban',
        name: 'Station Name',
        localSiteID: 'LOC123',
        location: {
          coordinates: [51.5, -0.1]
        },
        updated: '2025-07-06T12:00:00Z',
        pollutants: ['NO2', 'PM10']
      }
      const mockData = {
        MonitoringstResult: {
          getmonitoringstation: [mockStation]
        },
        stationdetails: mockStation,
        selectedYear: '2024',
        downloadPollutant: 'NO2',
        downloadFrequency: 'hourly',
        fullSearchQuery: { value: 'London' },
        locationMiles: '10',
        locationID: 'loc123',
        nooflocation: 'single'
      }
      return mockData[key]
    })

    axios.post.mockResolvedValue({ data: 'mockDownloadData' })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        hrefq: expect.stringContaining('/multiplelocations')
      })
    )
  })
})
