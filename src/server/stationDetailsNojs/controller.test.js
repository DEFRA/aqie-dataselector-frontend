import { stationDetailsNojsController } from './controller.js'
import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

// Mock logger configuration first
jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: {
    enabled: true,
    ignorePaths: ['/health'],
    redact: {
      paths: ['req.headers.authorization']
    }
  }
}))

// Mock logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

// Mock other dependencies
jest.mock('axios')
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/data/en/homecontent.js')

const mockedAxios = axios
const mockedConfig = config

describe('stationDetailsNojsController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock request object
    mockRequest = {
      url: {
        pathname: '/stationDetailsNojs/123'
      },
      params: {
        id: 'site123',
        year: '2023',
        download: null,
        pollutant: null,
        frequency: null,
        poll: 'NO2',
        freq: 'Daily'
      },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    // Mock h object
    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      response: jest.fn().mockReturnValue('response-value')
    }

    // Mock config
    mockedConfig.get.mockImplementation((key) => {
      switch (key) {
        case 'Table_URL':
          return 'http://table-api'
        case 'Download_URL':
          return 'http://download-api'
        default:
          return 'default-url'
      }
    })

    // Mock english content
    english.stationdetails = {
      pageTitle: 'Station Details',
      title: 'Station Title',
      serviceName: 'Station Service',
      maptoggletips: {
        Urban_traffic: 'Urban traffic tooltip',
        Urban_industrial: 'Urban industrial tooltip',
        Suburban_industrial: 'Suburban industrial tooltip',
        Suburban_background: 'Suburban background tooltip',
        Rural_background: 'Rural background tooltip',
        Urban_background: 'Urban background tooltip'
      }
    }

    // Setup default session data
    mockRequest.yar.get.mockImplementation((key) => {
      switch (key) {
        case 'SiteId':
          return 'site123'
        case 'MonitoringstResult':
          return {
            getmonitoringstation: [
              {
                id: 'site123',
                name: 'Test Station',
                region: 'Test Region',
                siteType: 'Urban Background',
                localSiteID: 'TS001',
                location: {
                  coordinates: [51.5074, -0.1278]
                },
                pollutants: {
                  NO2: true,
                  PM25: true
                }
              }
            ]
          }
        case 'stationdetails':
          return {
            id: 'site123',
            name: 'Test Station',
            region: 'Test Region',
            siteType: 'Urban Background',
            localSiteID: 'TS001',
            location: {
              coordinates: [51.5074, -0.1278]
            },
            pollutants: {
              NO2: true,
              PM25: true
            }
          }
        case 'selectedYear':
          return '2023'
        case 'latesttime':
          return '2023-12-01T10:00:00Z'
        case 'fullSearchQuery':
          return { value: 'London' }
        case 'locationID':
          return 'loc123'
        case 'nooflocation':
          return 'multiple'
        case 'tabledata':
          return [{ date: '2023-01-01', value: 10 }]
        case 'downloadresult':
          return { downloadUrl: 'http://download-url' }
        case 'viewData':
          return {}
        default:
          return null
      }
    })
  })

  describe('handler', () => {
    it('should handle normal station details request successfully', async () => {
      // Mock table API response
      mockedAxios.post.mockResolvedValueOnce({
        data: [{ date: '2023-01-01', value: 10 }]
      })

      const result = await stationDetailsNojsController.handler(
        mockRequest,
        mockH
      )

      expect(mockRequest.yar.set).toHaveBeenCalledWith('errors', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errorMessage', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('downloadresult', '')
      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.any(Object)
      )
      expect(result).toBe('view-response')
    })

    it('should set SiteId if not already set', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'SiteId':
            return null
          case 'MonitoringstResult':
            return {
              getmonitoringstation: [
                {
                  id: 'site123',
                  name: 'Test Station',
                  region: 'Test Region',
                  siteType: 'Urban Background',
                  localSiteID: 'TS001',
                  location: { coordinates: [51.5074, -0.1278] }
                }
              ]
            }
          case 'stationdetails':
            return {
              id: 'site123',
              name: 'Test Station',
              region: 'Test Region',
              siteType: 'Urban Background',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          default:
            return null
        }
      })

      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('SiteId', 'site123')
    })

    it('should handle download request', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/download/123'

      mockedAxios.post
        .mockResolvedValueOnce({ data: [] }) // Table API
        .mockResolvedValueOnce({ data: { downloadUrl: 'http://download-url' } }) // Download API

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('downloadresult', {
        downloadUrl: 'http://download-url'
      })
    })

    it('should handle download API error', async () => {
      mockRequest.url.pathname = '/stationDetailsNojs/download/123'

      const error = new Error('Download API Error')
      mockedAxios.post
        .mockResolvedValueOnce({ data: [] }) // Table API
        .mockRejectedValueOnce(error) // Download API

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('downloadresult', error)
    })

    it('should handle empty table data', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', null)
    })

    it('should handle valid table data', async () => {
      const validData = [{ date: '2023-01-01', value: 10 }]
      mockedAxios.post.mockResolvedValueOnce({ data: validData })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('tabledata', validData)
    })

    it('should get correct toggletip for Urban Traffic', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'SiteId':
            return 'site123'
          case 'MonitoringstResult':
            return {
              getmonitoringstation: [
                {
                  id: 'site123',
                  name: 'Test Station',
                  region: 'Test Region',
                  siteType: 'Urban Traffic',
                  localSiteID: 'TS001',
                  location: { coordinates: [51.5074, -0.1278] }
                }
              ]
            }
          case 'stationdetails':
            return {
              id: 'site123',
              name: 'Test Station',
              region: 'Test Region',
              siteType: 'Urban Traffic',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          default:
            return null
        }
      })

      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          maptoggletips: 'Urban traffic tooltip'
        })
      )
    })

    it('should handle single location href', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'SiteId':
            return 'site123'
          case 'MonitoringstResult':
            return {
              getmonitoringstation: [
                {
                  id: 'site123',
                  name: 'Test Station',
                  localSiteID: 'TS001',
                  location: { coordinates: [51.5074, -0.1278] }
                }
              ]
            }
          case 'nooflocation':
            return 'single'
          case 'stationdetails':
            return {
              id: 'site123',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          default:
            return null
        }
      })

      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          hrefq: '/multiplelocations'
        })
      )
    })

    it('should handle multiple location href', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'SiteId':
            return 'site123'
          case 'MonitoringstResult':
            return {
              getmonitoringstation: [
                {
                  id: 'site123',
                  name: 'Test Station',
                  localSiteID: 'TS001',
                  location: { coordinates: [51.5074, -0.1278] }
                }
              ]
            }
          case 'locationID':
            return 'loc123'
          case 'nooflocation':
            return 'multiple'
          case 'stationdetails':
            return {
              id: 'site123',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          default:
            return null
        }
      })

      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'stationDetailsNojs/index',
        expect.objectContaining({
          hrefq: '/location/loc123'
        })
      )
    })

    it('should build correct API parameters for table', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: [] })

      await stationDetailsNojsController.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledWith('http://table-api', {
        siteId: 'TS001',
        year: '2023'
      })
    })
  })
})
