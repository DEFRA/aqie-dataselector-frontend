import { downloadcontroller } from '~/src/server/download/controller.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

// Mock dependencies
jest.mock('axios')
jest.mock('~/src/config/config.js')

const mockedAxios = axios
const mockedConfig = config

describe('downloadcontroller', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock request object with proper url structure
    mockRequest = {
      url: {
        pathname: '/download/NO2/Daily'
      },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      },
      params: {
        poll: 'NO2',
        freq: 'Daily'
      }
    }

    // Mock h object
    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      response: jest.fn().mockReturnValue({
        type: jest.fn().mockReturnValue({
          code: jest.fn().mockReturnValue('json-response')
        })
      })
    }

    // Mock config
    mockedConfig.get.mockReturnValue('http://test-download-url')

    // Setup default mocks for yar.get
    mockRequest.yar.get.mockImplementation((key) => {
      switch (key) {
        case 'stationdetails':
          return {
            region: 'Test Region',
            siteType: 'Urban Background',
            name: 'Test Station',
            localSiteID: 'TS001',
            location: {
              coordinates: [51.5074, -0.1278]
            }
          }
        case 'selectedYear':
          return '2023'
        case 'latesttime':
          return '2023-12-01T10:00:00Z'
        case 'viewData':
          return {
            title: 'Test Title',
            stationdetails: {}
          }
        default:
          return null
      }
    })
  })

  describe('handler', () => {
    it('should return download result with status 200', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadresult',
        mockDownloadResult
      )
      expect(mockH.response).toHaveBeenCalledWith(mockDownloadResult)
      expect(result).toBe('json-response')
    })

    it('should handle nojs path correctly', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/PM10/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('stationDetailsNojs/index', {
        title: 'Test Title',
        stationdetails: {},
        downloadresult: mockDownloadResult
      })
      expect(result).toBe('view-response')
    })

    it('should build correct API parameters', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      const expectedApiParams = {
        region: 'Test Region',
        siteType: 'Urban Background',
        sitename: 'Test Station',
        siteId: 'TS001',
        latitude: '51.5074',
        longitude: '-0.1278',
        year: '2023',
        downloadpollutant: 'NO2',
        downloadpollutanttype: 'Daily',
        stationreaddate: '2023-12-01T10:00:00Z'
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://test-download-url',
        expectedApiParams
      )
    })

    it('should handle missing station details', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'stationdetails') return null
        if (key === 'selectedYear') return '2023'
        if (key === 'latesttime') return '2023-12-01T10:00:00Z'
        if (key === 'viewData') return {}
        return null
      })

      await downloadcontroller.handler(mockRequest, mockH)

      // Test that function handles missing data gracefully
      expect(mockRequest.yar.get).toHaveBeenCalled()
    })

    it('should handle different URL pathnames', async () => {
      mockRequest.url.pathname = '/different/path'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(mockDownloadResult)
    })

    it('should handle null viewData', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: {
                coordinates: [51.5074, -0.1278]
              }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return null
          default:
            return null
        }
      })

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(mockDownloadResult)
    })
  })
})
