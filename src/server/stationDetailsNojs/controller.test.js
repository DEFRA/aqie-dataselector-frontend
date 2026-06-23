import { stationDetailsNojsController } from '~/src/server/stationDetailsNojs/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'
import {
  parseDateFormat,
  getToggletip,
  invokeDownload,
  invokeTable,
  buildMapLocation,
  buildYearsArray,
  formatCurrentDate
} from '~/src/server/common/helpers/station-helpers.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: {
    enabled: true,
    ignorePaths: ['/health'],
    redact: {
      paths: ['req.headers.authorization']
    }
  }
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

jest.mock('~/src/server/data/en/homecontent.js')
jest.mock('~/src/server/common/helpers/station-helpers.js')
jest.mock('~/src/server/common/helpers/navigation-helpers.js')

describe('stationDetailsNojsController', () => {
  let mockRequest
  let mockH
  const mockStation = {
    id: 'site123',
    region: 'region1',
    siteType: 'Urban Traffic',
    name: 'StationName',
    localSiteID: 'LOCAL123',
    location: { coordinates: [51.5, -0.1] },
    pollutants: ['NO2', 'PM10']
  }

  beforeEach(() => {
    jest.clearAllMocks()

    isInternalNavigation.mockReturnValue(true)
    renderNotFound.mockReturnValue('not-found-response')
    parseDateFormat.mockReturnValue('12:00 pm on 21 June 2026')
    getToggletip.mockReturnValue('Urban traffic toggletip')
    invokeTable.mockResolvedValue({ rows: [{ data: 'test' }] })
    invokeDownload.mockResolvedValue({ result: 'downloaded' })
    buildMapLocation.mockReturnValue(
      'https://www.google.co.uk/maps?q=51.5,-0.1'
    )
    buildYearsArray.mockReturnValue([
      2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
    ])
    formatCurrentDate.mockReturnValue('22 June')

    english.stationdetails = {
      pageTitle: 'Stations summary details',
      title: { title1: 'Stations summary details' },
      serviceName: 'Get air pollution data',
      maptoggletips: {
        Urban_traffic: 'Urban traffic tip'
      }
    }
    english.errorpages = { content: 'Error content' }

    mockRequest = {
      method: 'post',
      url: {
        pathname: '/stationDetailsNojs/site123/2026'
      },
      params: {
        id: 'site123',
        year: '2026'
      },
      payload: {
        stationId: 'site123'
      },
      headers: {
        referer: 'http://localhost:3001/monitoring-station'
      },
      info: {
        host: 'localhost:3001'
      },
      yar: {
        get: jest.fn((key) => {
          const session = {
            MonitoringstResult: {
              getmonitoringstation: [mockStation]
            },
            stationdetails: mockStation,
            selectedYear: '2026',
            latesttime: '2026-06-21T00:00:00Z',
            fullSearchQuery: { value: 'London' },
            nooflocation: 'multiple',
            locationID: 'loc123',
            SiteId: 'site123',
            tabledata: { rows: [{ data: 'test' }] },
            downloadresult: null
          }
          return session[key]
        }),
        set: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      response: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  describe('handler', () => {
    it('should return 404 when request is not internal navigation', async () => {
      isInternalNavigation.mockReturnValue(false)

      const result = await stationDetailsNojsController.handler(
        mockRequest,
        mockH
      )

      expect(isInternalNavigation).toHaveBeenCalledWith(mockRequest)
      expect(renderNotFound).toHaveBeenCalledWith(mockH)
      expect(result).toBe('not-found-response')
    })

    it('should set SiteId from POST payload when stationId is present', async () => {
      mockRequest.method = 'post'
      mockRequest.payload = { stationId: 'newSite456' }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('SiteId', 'newSite456')
    })

    it('should set SiteId from GET params when id is present', async () => {
      mockRequest.method = 'get'
      mockRequest.payload = {}
      mockRequest.params = { id: 'getSite789', year: '2025' }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('SiteId', 'getSite789')
    })

    it('should not set SiteId from params when method is get but no id', async () => {
      mockRequest.method = 'get'
      mockRequest.payload = {}
      mockRequest.params = { year: '2025' }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'SiteId',
        expect.anything()
      )
    })

    it('should clear errors, errorMessage, and downloadresult on request', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('errors', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errorMessage', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('downloadresult', '')
    })

    it('should handle download params when request.params.download is set', async () => {
      mockRequest.params = {
        id: 'site123',
        year: '2026',
        download: '2025',
        pollutant: 'NO2',
        frequency: 'hourly'
      }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadPollutant',
        'NO2'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadFrequency',
        'hourly'
      )
    })

    it('should not set download params when request.params.download is not set', async () => {
      mockRequest.params = { id: 'site123', year: '2026' }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'downloadPollutant',
        expect.anything()
      )
      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'downloadFrequency',
        expect.anything()
      )
    })

    it('should find the station from MonitoringstResult and set stationdetails', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'stationdetails',
        mockStation
      )
    })

    it('should set latesttime as yesterday ISO date', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'latesttime',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      )
    })

    it('should call parseDateFormat with the formatted date', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(parseDateFormat).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      )
    })

    it('should call buildYearsArray to generate years', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(buildYearsArray).toHaveBeenCalled()
    })

    it('should call formatCurrentDate', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(formatCurrentDate).toHaveBeenCalled()
    })

    it('should call buildMapLocation with station coordinates', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(buildMapLocation).toHaveBeenCalledWith(51.5, -0.1)
    })

    it('should set selectedYear from params.year for NoJs path', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/site123/2025'
      mockRequest.params.year = '2025'

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
    })

    it('should set selectedYear to current year when params.year is absent on NoJs path', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/site123'
      mockRequest.params = { id: 'site123' }
      mockRequest.method = 'get'

      await stationDetailsNojsController.handler(mockRequest, mockH)

      const currentYear = String(new Date().getFullYear())
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedYear',
        currentYear
      )
    })

    it('should set selectedYear from params.year when path does not include NoJs', async () => {
      mockRequest.url.pathname = '/stationdetails/site123/2024'
      mockRequest.params.year = '2024'

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2024')
    })

    it('should call invokeTable with correct params', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(invokeTable).toHaveBeenCalledWith({
        siteId: 'LOCAL123',
        year: expect.anything()
      })
    })

    it('should set tabledata to null when invokeTable returns empty array', async () => {
      invokeTable.mockResolvedValue([])

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', null)
    })

    it('should set tabledata to null when invokeTable returns null', async () => {
      invokeTable.mockResolvedValue(null)

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', null)
    })

    it('should set tabledata to null when invokeTable returns empty object', async () => {
      invokeTable.mockResolvedValue({})

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', null)
    })

    it('should set tabledata when invokeTable returns valid data', async () => {
      const tableData = { rows: [{ col1: 'data' }] }
      invokeTable.mockResolvedValue(tableData)

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', tableData)
    })

    it('should not call invokeDownload when path does not include download', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/site123/2026'

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(invokeDownload).not.toHaveBeenCalled()
    })

    it('should call invokeDownload when path includes download', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/download/NO2/hourly'
      mockRequest.params = {
        id: 'site123',
        year: '2026',
        poll: 'NO2',
        freq: 'hourly'
      }

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(invokeDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'region1',
          siteType: 'Urban Traffic',
          sitename: 'StationName',
          siteId: 'LOCAL123',
          latitude: '51.5',
          longitude: '-0.1',
          downloadpollutant: 'NO2',
          downloadpollutanttype: 'hourly'
        }),
        expect.anything()
      )
    })

    it('should set downloadresult in session after download', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/download/NO2/hourly'
      mockRequest.params = {
        id: 'site123',
        poll: 'NO2',
        freq: 'hourly'
      }
      invokeDownload.mockResolvedValue({ file: 'data.csv' })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('downloadresult', {
        file: 'data.csv'
      })
    })

    it('should render stationDetailsNojs/index view', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          pageTitle: 'Stations summary details',
          serviceName: 'Get air pollution data',
          stationdetails: mockStation,
          displayBacklink: true
        })
      )
    })

    it('should return the view response', async () => {
      const result = await stationDetailsNojsController.handler(
        mockRequest,
        mockH
      )

      expect(result).toBe('view-response')
    })

    it('should pass maplocation in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          maplocation: 'https://www.google.co.uk/maps?q=51.5,-0.1'
        })
      )
    })

    it('should pass updatedTime in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          updatedTime: '12:00 pm on 21 June 2026'
        })
      )
    })

    it('should pass years array in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
        })
      )
    })

    it('should pass currentdate in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          currentdate: '22 June'
        })
      )
    })

    it('should pass pollutantKeys from stationDetails', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          pollutantKeys: ['NO2', 'PM10']
        })
      )
    })

    it('should pass maptoggletips from getToggletip', async () => {
      getToggletip.mockReturnValue('Urban traffic toggletip')

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(getToggletip).toHaveBeenCalledWith('Urban Traffic')
      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          maptoggletips: 'Urban traffic toggletip'
        })
      )
    })

    it('should pass fullSearchQuery from session in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          fullSearchQuery: 'London'
        })
      )
    })

    it('should set hrefq to /multiplelocations when nooflocation is single', async () => {
      mockRequest.yar.get = jest.fn((key) => {
        const session = {
          MonitoringstResult: { getmonitoringstation: [mockStation] },
          stationdetails: mockStation,
          selectedYear: '2026',
          fullSearchQuery: { value: 'London' },
          nooflocation: 'single',
          locationID: 'loc123',
          SiteId: 'site123',
          tabledata: { rows: [] }
        }
        return session[key]
      })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          hrefq: '/multiplelocations'
        })
      )
    })

    it('should set hrefq to /location/{locationID} when nooflocation is not single', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          hrefq: '/location/loc123'
        })
      )
    })

    it('should set viewData in session', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'viewData',
        expect.objectContaining({
          pageTitle: 'Stations summary details',
          stationdetails: mockStation
        })
      )
    })

    it('should pass currentYear in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      const currentYear = new Date().getFullYear()
      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          currentYear
        })
      )
    })

    it('should pass title from english.stationdetails in view data', async () => {
      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          title: { title1: 'Stations summary details' }
        })
      )
    })

    it('should handle station with different siteType', async () => {
      const urbanBgStation = {
        ...mockStation,
        siteType: 'Urban Background'
      }
      mockRequest.yar.get = jest.fn((key) => {
        const session = {
          MonitoringstResult: { getmonitoringstation: [urbanBgStation] },
          stationdetails: urbanBgStation,
          selectedYear: '2026',
          fullSearchQuery: { value: 'London' },
          nooflocation: 'multiple',
          locationID: 'loc123',
          SiteId: 'site123',
          tabledata: null
        }
        return session[key]
      })
      getToggletip.mockReturnValue('Urban background tip')

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(getToggletip).toHaveBeenCalledWith('Urban Background')
    })

    it('should handle when fullSearchQuery is undefined in session', async () => {
      mockRequest.yar.get = jest.fn((key) => {
        const session = {
          MonitoringstResult: { getmonitoringstation: [mockStation] },
          stationdetails: mockStation,
          selectedYear: '2026',
          fullSearchQuery: undefined,
          nooflocation: 'multiple',
          locationID: 'loc123',
          SiteId: 'site123',
          tabledata: null
        }
        return session[key]
      })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          fullSearchQuery: undefined
        })
      )
    })

    it('should set tabledata as array with data when invokeTable returns non-empty array', async () => {
      const tableArr = [{ pollutant: 'NO2', value: 40 }]
      invokeTable.mockResolvedValue(tableArr)

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', tableArr)
    })
  })
})
