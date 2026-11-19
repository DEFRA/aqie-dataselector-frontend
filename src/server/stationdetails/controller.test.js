import {
  stationDetailsController,
  last24HoursController,
  last7DaysController
} from './controller.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

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
      method: 'post',
      params: {
        id: 'site123'
      },
      payload: { stationId: 'site123' },
      headers: {
        referer: 'http://localhost:3001/location'
      },
      info: {
        host: 'localhost:3001'
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
            nooflocation: 'multiple',
            SiteId: 'site123'
          }
          return session[key]
        }),
        set: jest.fn()
      }
    }

    jest.clearAllMocks()
    config.set('featureFlags.viewDaqiTab', true)
  })

  afterEach(() => {
    config.set('featureFlags.viewDaqiTab', false)
  })

  it('should show the year view and skip DAQI when the DAQI tab flag is off', async () => {
    config.set('featureFlags.viewDaqiTab', false)
    request.params.download = undefined
    axios.post.mockResolvedValue({ data: { some: 'data' } })

    await stationDetailsController.handler(request, h)

    expect(axios.get).not.toHaveBeenCalledWith(
      expect.stringContaining('period=24h')
    )
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'year',
        viewDaqiTab: false,
        daqi: {}
      })
    )
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
        hrefq: '/location'
      })
    )

    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should update selectedYear when request.params.year is provided', async () => {
    request.params.year = '2023'

    await stationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('selectedYear', '2023')
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        selectedYear: '2023',
        finalyear: '2023',
        activePeriod: 'year'
      })
    )
  })

  it('should default activePeriod to daqi and resolve DAQI summary when station has siteId', async () => {
    const stationWithSiteId = {
      id: 'site123',
      siteId: 'UKA00315',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5', 'Nitrogen dioxide']
    }
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [stationWithSiteId] },
        stationdetails: stationWithSiteId,
        selectedYear: 2024,
        SiteId: 'site123'
      }
      return session[key]
    })
    axios.get.mockResolvedValue({
      data: {
        to: '2026-10-30T12:00:00.000Z',
        summary: {
          measuredAt: '2026-10-30T12:00:00.000Z',
          pollutants: {
            PM25: {
              daqi: {
                concentration: 12.1,
                index: 2,
                measuredAt: '2026-10-30T12:00:00.000Z',
                averagingPeriod: '24-hour mean'
              }
            },
            NO2: {
              daqi: {
                concentration: 201.4,
                index: 4,
                measuredAt: '2026-10-30T12:00:00.000Z',
                averagingPeriod: '1-hour mean'
              }
            }
          }
        }
      }
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'daqi',
        daqi: expect.objectContaining({
          measuredAt: '2026-10-30T12:00:00.000Z',
          pollutants: [
            expect.objectContaining({
              pollutantName: 'PM2.5',
              average: 12,
              daqiIndex: 2,
              daqiBand: 'low',
              averagingPeriod: '24 hour average'
            }),
            expect.objectContaining({
              pollutantName: 'Nitrogen dioxide',
              average: 201,
              daqiIndex: 4,
              daqiBand: 'moderate',
              averagingPeriod: 'Hourly average'
            })
          ]
        })
      })
    )
  })

  it('should return empty daqi object when the station history fetch fails', async () => {
    const stationWithSiteId = {
      id: 'site123',
      siteId: 'UKA00315',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5']
    }
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [stationWithSiteId] },
        stationdetails: stationWithSiteId,
        selectedYear: 2024,
        SiteId: 'site123'
      }
      return session[key]
    })
    axios.get.mockRejectedValue(new Error('network error'))

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'daqi',
        daqi: {}
      })
    )
  })

  describe('what is fetched for the active tab', () => {
    const stationWithSiteId = {
      id: 'site123',
      siteId: 'UKA00315',
      localSiteID: 'LOCAL1',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5']
    }

    beforeEach(() => {
      request.yar.get = jest.fn(
        (key) =>
          ({
            MonitoringstResult: { getmonitoringstation: [stationWithSiteId] },
            stationdetails: stationWithSiteId,
            selectedYear: 2024,
            SiteId: 'site123'
          })[key]
      )
      axios.get.mockResolvedValue({ data: { summary: { pollutants: {} } } })
      axios.post.mockResolvedValue({ data: { some: 'data' } })
    })

    it('does not fetch the year table on the DAQI view', async () => {
      await stationDetailsController.handler(request, h)

      expect(axios.post).not.toHaveBeenCalled()
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('period=24h')
      )
      expect(request.yar.set).not.toHaveBeenCalledWith(
        'tabledata',
        expect.anything()
      )
      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ activePeriod: 'daqi', tabledata: null })
      )
    })

    it('fetches the year table, and not the DAQI history, on a year route', async () => {
      request.params.year = '2023'

      await stationDetailsController.handler(request, h)

      expect(axios.get).not.toHaveBeenCalled()
      expect(axios.post).toHaveBeenCalledTimes(1)
      expect(axios.post.mock.calls[0][1]).toEqual(
        expect.objectContaining({ siteId: 'LOCAL1', year: '2023' })
      )
      expect(request.yar.set).toHaveBeenCalledWith('tabledata', {
        some: 'data'
      })
      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({
          activePeriod: 'year',
          tabledata: { some: 'data' },
          daqi: {}
        })
      )
    })
  })

  describe('hourly readings for users without JavaScript', () => {
    const stationWithSiteId = {
      id: 'site123',
      siteId: 'UKA00315',
      localSiteID: 'LOCAL1',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5']
    }

    beforeEach(() => {
      request.yar.get = jest.fn(
        (key) =>
          ({
            MonitoringstResult: { getmonitoringstation: [stationWithSiteId] },
            stationdetails: stationWithSiteId,
            selectedYear: 2024,
            SiteId: 'site123'
          })[key]
      )
      axios.get.mockResolvedValue({
        data: {
          pollutants: {
            PM25: [{ time: '2026-11-03T10:00:00.000Z', value: 5.2 }]
          },
          summary: { pollutants: {} }
        }
      })
      axios.post.mockResolvedValue({ data: { some: 'data' } })
      config.set('featureFlags.viewGraphSummary', true)
    })

    afterEach(() => {
      config.set('featureFlags.viewGraphSummary', false)
    })

    it('gives the DAQI view the last 24 hours of readings, from the history it already fetched', async () => {
      await stationDetailsController.handler(request, h)

      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({
          activePeriod: 'daqi',
          hourlyReadings: expect.objectContaining({
            period: 'last24hours',
            title: 'View hourly data for the last 24 hours',
            table: expect.objectContaining({
              caption: 'Hourly readings in µg/m³ for the last 24 hours'
            })
          })
        })
      )
    })

    it('gives a year view none, as it shows no 24 hour data', async () => {
      request.params.year = '2023'

      await stationDetailsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ activePeriod: 'year', hourlyReadings: null })
      )
    })

    it('gives none when the graph feature is off', async () => {
      config.set('featureFlags.viewGraphSummary', false)

      await stationDetailsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ hourlyReadings: null })
      )
    })

    it('gives none when the history cannot be fetched', async () => {
      axios.get.mockRejectedValue(new Error('network error'))

      await stationDetailsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ daqi: {}, hourlyReadings: null })
      )
    })
  })

  it('should include the graph summary CTA, opening on the last 24 hours, for the station', async () => {
    request.params.download = undefined
    config.set('featureFlags.viewGraphSummary', true)

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        viewGraphSummary: {
          buttonText: 'View graph and pollutant summary',
          href: '/stationdetails/graph-summary?stationId=site123&period=last24hours'
        }
      })
    )
  })

  it('should not include graph summary CTA when the feature flag is off', async () => {
    request.params.download = undefined
    config.set('featureFlags.viewGraphSummary', false)

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({ viewGraphSummary: null })
    )
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

  it('should return 404 if request has no valid referer (direct access)', async () => {
    request.headers = {}
    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'error/index',
      expect.objectContaining({
        statusCode: '404'
      })
    )
    expect(h.code).toHaveBeenCalledWith(404)
  })

  it('should render the view for a trusted deep link with no referer, consuming the flag', async () => {
    request.method = 'get'
    request.payload = undefined
    request.headers = {}
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'urban',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2', 'PM10']
    }
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'single',
        SiteId: 'site123',
        deepLinkTrusted: true
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('deepLinkTrusted', false)
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({ hrefq: '/multiplelocations' })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('should return 404 if monitoring result is missing', async () => {
    request.yar.get = jest.fn((key) => {
      const session = {
        stationdetails: {},
        selectedYear: 2024,
        SiteId: 'site123'
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
        MonitoringstResult: { getmonitoringstation: 'not-an-array' },
        SiteId: 'site123'
      }
      return session[key]
    })

    const result = await stationDetailsController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Invalid monitoring data format')
    expect(h.code).toHaveBeenCalledWith(500)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  it('should return 404 if station is not found in monitoring result', async () => {
    request.payload = { stationId: 'nonexistent' }
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: {
          getmonitoringstation: [{ id: 'site123' }]
        },
        SiteId: 'nonexistent'
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

  it('should return correct toggletip for Urban Industrial', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Urban Industrial',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        maptoggletips: expect.anything()
      })
    )
  })

  it('should return correct toggletip for Suburban Industrial', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Suburban Industrial',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
  })

  it('should return correct toggletip for Suburban Background', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Suburban Background',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
  })

  it('should return correct toggletip for Rural Background', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Rural Background',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
  })

  it('should return correct toggletip for Urban Background', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Urban Background',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalled()
  })

  it('should return null for unknown siteType', async () => {
    const station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Unknown Type',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['NO2'],
      updated: '2025-07-15T00:00:00Z'
    }

    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [station] },
        stationdetails: station,
        selectedYear: 2024,
        nooflocation: 'multiple',
        locationID: 'loc1'
      }
      return session[key]
    })

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        maptoggletips: null
      })
    )
  })
})

describe('last24HoursController.handler', () => {
  let h, request, station

  const summary = (periodAverage, hourlyExceedances = null) => ({
    periodAverage,
    dataCapture: {
      validHours: 24,
      expectedHours: 24,
      capturePercentage: 100,
      isLowDataCapture: false
    },
    hourlyExceedances,
    dailyExceedances: null
  })

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis(),
      response: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    station = {
      id: 'site123',
      siteId: 'UKA00315',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5', 'Nitrogen dioxide']
    }

    request = {
      method: 'get',
      params: {},
      payload: undefined,
      headers: { referer: 'http://localhost:3010/stationdetails' },
      info: { host: 'localhost:3010' },
      yar: {
        get: jest.fn((key) => {
          const session = {
            MonitoringstResult: { getmonitoringstation: [station] },
            stationdetails: station,
            selectedYear: 2024,
            nooflocation: 'multiple',
            SiteId: 'site123'
          }
          return session[key]
        }),
        set: jest.fn()
      }
    }

    jest.clearAllMocks()
  })

  it('renders the station details view on the last 24 hours tab with the 24 hour figures', async () => {
    axios.get.mockResolvedValue({
      data: {
        from: '2026-11-02T12:00:00.000Z',
        to: '2026-11-03T11:00:00.000Z',
        pollutants: {},
        summary: {
          pollutants: { PM25: summary(11.6), NO2: summary(150.2, 1) }
        }
      }
    })

    const result = await last24HoursController.handler(request, h)

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('period=24h')
    )
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('siteId=UKA00315')
    )
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'last24hours',
        daqi: {},
        last24Hours: expect.objectContaining({
          pollutants: [
            expect.objectContaining({
              pollutantName: 'PM2.5',
              average: 12,
              dataCapturePercentage: 100,
              hourlyCount: 'no legal limit'
            }),
            expect.objectContaining({
              pollutantName: 'Nitrogen dioxide',
              average: 150,
              hourlyCount: 1
            })
          ]
        })
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('does not fetch the year table for a tab that does not show it', async () => {
    axios.get.mockResolvedValue({ data: { pollutants: {}, summary: {} } })

    await last24HoursController.handler(request, h)

    expect(axios.post).not.toHaveBeenCalled()
    expect(request.yar.set).not.toHaveBeenCalledWith(
      'tabledata',
      expect.anything()
    )
  })

  it('shows the no-mapping state when the station has no AURN siteId', async () => {
    delete station.siteId

    await last24HoursController.handler(request, h)

    expect(axios.get).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'last24hours',
        last24Hours: { noMapping: true }
      })
    )
  })

  it('shows the no-data state when the upstream call fails', async () => {
    axios.get.mockRejectedValue(new Error('fail'))

    await last24HoursController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'last24hours',
        last24Hours: {}
      })
    )
  })

  it('returns 404 if request has no valid referer (direct access)', async () => {
    request.headers = {}

    await last24HoursController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'error/index',
      expect.objectContaining({ statusCode: '404' })
    )
    expect(h.code).toHaveBeenCalledWith(404)
  })

  describe('hourly readings for users without JavaScript', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: {
          from: '2026-11-02T12:00:00.000Z',
          to: '2026-11-03T11:00:00.000Z',
          pollutants: {
            PM25: [{ time: '2026-11-03T10:00:00.000Z', value: 5.2 }]
          },
          summary: { pollutants: {} }
        }
      })
      config.set('featureFlags.viewGraphSummary', true)
    })

    afterEach(() => {
      config.set('featureFlags.viewGraphSummary', false)
    })

    it('gives the last 24 hours view its readings, from the history it already fetched', async () => {
      await last24HoursController.handler(request, h)

      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({
          activePeriod: 'last24hours',
          hourlyReadings: expect.objectContaining({
            period: 'last24hours',
            title: 'View hourly data for the last 24 hours',
            table: expect.objectContaining({
              caption: 'Hourly readings in µg/m³ for the last 24 hours'
            })
          })
        })
      )
    })

    it('gives none when the graph feature is off', async () => {
      config.set('featureFlags.viewGraphSummary', false)

      await last24HoursController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ hourlyReadings: null })
      )
    })

    it('gives none for a station with no AURN siteId', async () => {
      delete station.siteId

      await last24HoursController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ hourlyReadings: null })
      )
    })

    it('gives none when the history cannot be fetched', async () => {
      axios.get.mockRejectedValue(new Error('network error'))

      await last24HoursController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ last24Hours: {}, hourlyReadings: null })
      )
    })
  })

  describe('graph summary button', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { pollutants: {}, summary: {} } })
      config.set('featureFlags.viewGraphSummary', true)
    })

    afterEach(() => {
      config.set('featureFlags.viewGraphSummary', false)
    })

    it('links the button to the last 24 hours of the station', async () => {
      await last24HoursController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({
          activePeriod: 'last24hours',
          viewGraphSummary: {
            buttonText: 'View graph and pollutant summary',
            href: '/stationdetails/graph-summary?stationId=site123&period=last24hours'
          }
        })
      )
    })

    it('has no button when the graph feature is off', async () => {
      config.set('featureFlags.viewGraphSummary', false)

      await last24HoursController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/index',
        expect.objectContaining({ viewGraphSummary: null })
      )
    })
  })
})

describe('stationDetailsController tab selection', () => {
  let h, request, station

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis(),
      response: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }
    station = {
      id: 'site123',
      localSiteID: 'LOCAL1',
      region: 'region1',
      siteType: 'urban',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5']
    }
    request = {
      method: 'get',
      params: {},
      headers: { referer: 'http://localhost:3010/location' },
      info: { host: 'localhost:3010' },
      yar: {
        get: jest.fn(
          (key) =>
            ({
              MonitoringstResult: { getmonitoringstation: [station] },
              stationdetails: station,
              SiteId: 'site123'
            })[key]
        ),
        set: jest.fn()
      }
    }
    jest.clearAllMocks()
    config.set('featureFlags.viewDaqiTab', true)
  })

  afterEach(() => {
    config.set('featureFlags.viewDaqiTab', false)
  })

  it('defaults to the Daily Air Quality Index tab without fetching the year table', async () => {
    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({ activePeriod: 'daqi', last24Hours: {} })
    )
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('opens the Last 24 hours tab on its own route, even when the DAQI tab flag is off', async () => {
    config.set('featureFlags.viewDaqiTab', false)

    await last24HoursController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({ activePeriod: 'last24hours', daqi: {} })
    )
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('fetches the year table for a year route', async () => {
    request.params.year = '2025'
    axios.post.mockResolvedValue({ data: [{ pollutantName: 'PM2.5' }] })

    await stationDetailsController.handler(request, h)

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', [
      { pollutantName: 'PM2.5' }
    ])
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        activePeriod: 'year',
        daqi: {},
        last24Hours: {}
      })
    )
  })
})

describe('last7DaysController.handler', () => {
  let h, request, station

  beforeEach(() => {
    h = {
      view: jest.fn().mockReturnThis(),
      response: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    station = {
      id: 'site123',
      region: 'region1',
      siteType: 'Urban Traffic',
      name: 'StationName',
      location: { coordinates: [1.23, 4.56] },
      pollutants: ['PM2.5', 'Nitrogen dioxide'],
      siteId: 'UKA00315'
    }

    request = {
      method: 'get',
      params: {},
      payload: undefined,
      headers: {
        referer: 'http://localhost:3010/stationdetails'
      },
      info: {
        host: 'localhost:3010'
      },
      yar: {
        get: jest.fn((key) => {
          const session = {
            MonitoringstResult: { getmonitoringstation: [station] },
            selectedYear: 2024,
            fullSearchQuery: { value: 'mockFullSearchQuery' },
            nooflocation: 'multiple',
            SiteId: 'site123'
          }
          return session[key]
        }),
        set: jest.fn()
      }
    }
  })

  it("renders the 7-day view with real data for the station's pollutants", async () => {
    const summary = (periodAverage) => ({
      periodAverage,
      dataCapture: {
        validHours: 168,
        expectedHours: 168,
        capturePercentage: 100,
        isLowDataCapture: false
      },
      hourlyExceedances: null,
      dailyExceedances: null
    })
    axios.get.mockResolvedValue({
      data: {
        from: '2026-08-19T01:00:00.000Z',
        to: '2026-08-26T00:00:00.000Z',
        pollutants: {},
        summary: {
          daqiIndex: 2,
          pollutants: { PM25: summary(8.2), NO2: summary(52.4) }
        }
      }
    })

    const result = await last7DaysController.handler(request, h)

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('siteId=UKA00315')
    )
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/last-7-days',
      expect.objectContaining({
        pageTitle: 'Last 7 days',
        serviceName: 'Get air pollution data',
        stationdetails: station,
        displayBacklink: true,
        fullSearchQuery: 'mockFullSearchQuery',
        years: expect.any(Array),
        hrefq: '/location',
        last7Days: expect.objectContaining({
          periodStart: '2026-08-19T00:00:00.000Z',
          periodEnd: '2026-08-25T23:00:00.000Z',
          latestReadingAt: '2026-08-26T00:00:00.000Z',
          pollutants: [
            expect.objectContaining({ pollutantName: 'PM2.5', average: 8 }),
            expect.objectContaining({
              pollutantName: 'Nitrogen dioxide',
              average: 52
            })
          ]
        })
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('shows the no-mapping state when the station has no AURN siteId', async () => {
    delete station.siteId

    const result = await last7DaysController.handler(request, h)

    expect(axios.get).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/last-7-days',
      expect.objectContaining({
        last7Days: { noMapping: true }
      })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('shows no pollutant rows when the back end returns no summary', async () => {
    axios.get.mockResolvedValue({
      data: {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {
          PM25: [{ time: '2026-08-19T01:00:00.000Z', value: 8 }]
        }
      }
    })

    await last7DaysController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/last-7-days',
      expect.objectContaining({
        last7Days: expect.objectContaining({ pollutants: [] })
      })
    )
  })

  it('shows the no-data state when the upstream call fails', async () => {
    axios.get.mockRejectedValue(new Error('fail'))

    const result = await last7DaysController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/last-7-days',
      expect.objectContaining({ last7Days: {} })
    )
    expect(result).toBe(h.view.mock.results[0].value)
  })

  it('returns 404 if request has no valid referer (direct access)', async () => {
    request.headers = {}
    await last7DaysController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'error/index',
      expect.objectContaining({ statusCode: '404' })
    )
    expect(h.code).toHaveBeenCalledWith(404)
  })

  it('returns 404 if station is not found in monitoring result', async () => {
    request.yar.get = jest.fn((key) => {
      const session = {
        MonitoringstResult: { getmonitoringstation: [{ id: 'other' }] },
        SiteId: 'site123'
      }
      return session[key]
    })

    const result = await last7DaysController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Station not found')
    expect(h.code).toHaveBeenCalledWith(404)
    expect(result).toBe(h.response.mock.results[0].value)
  })

  describe('hourly readings for users without JavaScript', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: {
          from: '2026-08-19T01:00:00.000Z',
          to: '2026-08-26T00:00:00.000Z',
          pollutants: {
            PM25: [{ time: '2026-08-19T01:00:00.000Z', value: 8 }]
          },
          summary: { daqiIndex: 2, pollutants: {} }
        }
      })
      config.set('featureFlags.viewGraphSummary', true)
    })

    afterEach(() => {
      config.set('featureFlags.viewGraphSummary', false)
    })

    it('gives the 7-day view the last 7 days of readings, from the history it already fetched', async () => {
      await last7DaysController.handler(request, h)

      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/last-7-days',
        expect.objectContaining({
          hourlyReadings: expect.objectContaining({
            period: 'last7days',
            title: 'View hourly data for the last 7 days',
            table: expect.objectContaining({
              caption: 'Hourly readings in µg/m³ for the last 7 days'
            })
          })
        })
      )
    })

    it('gives none when the graph feature is off', async () => {
      config.set('featureFlags.viewGraphSummary', false)

      await last7DaysController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/last-7-days',
        expect.objectContaining({ hourlyReadings: null })
      )
    })

    it('gives none for a station with no AURN siteId', async () => {
      delete station.siteId

      await last7DaysController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/last-7-days',
        expect.objectContaining({ hourlyReadings: null })
      )
    })
  })

  describe('graph summary button', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { pollutants: {}, summary: {} } })
      config.set('featureFlags.viewGraphSummary', true)
    })

    afterEach(() => {
      config.set('featureFlags.viewGraphSummary', false)
    })

    it('links the button to the last 7 days of the station', async () => {
      await last7DaysController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/last-7-days',
        expect.objectContaining({
          viewGraphSummary: {
            buttonText: 'View graph and pollutant summary',
            href: '/stationdetails/graph-summary?stationId=site123&period=last7days'
          }
        })
      )
    })

    it('has no button when the graph feature is off', async () => {
      config.set('featureFlags.viewGraphSummary', false)

      await last7DaysController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'stationdetails/last-7-days',
        expect.objectContaining({ viewGraphSummary: null })
      )
    })
  })
})
