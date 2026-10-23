import {
  stationDetailsController,
  graphSummaryController,
  buildViewGraphSummary
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

  it('should include tab-aware graph summary CTA metadata for the monitoring station summary', async () => {
    request.params.download = undefined
    config.set('featureFlags.viewGraphSummary', true)

    await stationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/index',
      expect.objectContaining({
        viewGraphSummary: expect.objectContaining({
          title: 'View graph and pollutant summary',
          buttonText: 'View graph and pollutant summary',
          href: expect.stringContaining('period=last7days')
        })
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

describe('buildViewGraphSummary', () => {
  const buildRequest = ({ session = {}, query, payload, method } = {}) => ({
    method,
    query,
    payload,
    yar: { get: jest.fn((key) => session[key]), set: jest.fn() }
  })

  beforeEach(() => {
    config.set('featureFlags.viewGraphSummary', true)
  })

  it('returns null when the feature flag is off', () => {
    config.set('featureFlags.viewGraphSummary', false)

    expect(buildViewGraphSummary(buildRequest())).toBeNull()
  })

  it.each([
    ['last24hours', 'last24hours'],
    ['daily', 'last24hours'],
    ['daqi', 'last24hours'],
    ['last7days', 'last7days'],
    ['year', 'last7days']
  ])('maps the %s period to %s', (period, expected) => {
    const result = buildViewGraphSummary(
      buildRequest({ query: { period }, session: { SiteId: 'site1' } })
    )

    expect(result.href).toBe(
      `/stationdetails/graph-summary?stationId=site1&period=${expected}`
    )
  })

  it('reads the period from the payload', () => {
    const result = buildViewGraphSummary(
      buildRequest({ payload: { period: 'daily' }, session: { SiteId: 's' } })
    )

    expect(result.href).toContain('period=last24hours')
  })

  it('defaults to last7days when a year is selected', () => {
    const result = buildViewGraphSummary(
      buildRequest({ session: { SiteId: 's', selectedYear: 2024 } })
    )

    expect(result.href).toContain('period=last7days')
  })

  it('defaults to last24hours when no period or year is known', () => {
    const result = buildViewGraphSummary(
      buildRequest({ session: { SiteId: 's' } })
    )

    expect(result.href).toContain('period=last24hours')
  })

  it('uses and stores the station id from a POST payload', () => {
    const request = buildRequest({
      method: 'post',
      payload: { stationId: 'posted' }
    })

    const result = buildViewGraphSummary(request)

    expect(result.href).toContain('stationId=posted')
    expect(request.yar.set).toHaveBeenCalledWith('SiteId', 'posted')
  })

  it('uses an empty station id when none is available', () => {
    const result = buildViewGraphSummary(buildRequest())

    expect(result.href).toContain('stationId=&')
  })
})

describe('graphSummaryController.handler', () => {
  const h = { view: jest.fn().mockReturnValue('view') }
  const station = { id: 'site1' }
  const buildRequest = (query) => ({
    query,
    yar: {
      get: jest.fn((key) => ({ stationdetails: station, SiteId: 'sess' })[key])
    }
  })

  it('renders the graph summary view using query values', () => {
    const result = graphSummaryController.handler(
      buildRequest({ stationId: 'q1', period: 'last7days' }),
      h
    )

    expect(result).toBe('view')
    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/graph-summary',
      expect.objectContaining({
        stationdetails: station,
        stationId: 'q1',
        period: 'last7days',
        periodLabel: 'last 7 days'
      })
    )
  })

  it('falls back to the session station and last 24 hours', () => {
    graphSummaryController.handler(buildRequest(undefined), h)

    expect(h.view).toHaveBeenCalledWith(
      'stationdetails/graph-summary',
      expect.objectContaining({
        stationId: 'sess',
        period: 'last24hours',
        periodLabel: 'last 24 hours'
      })
    )
  })
})
