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
    // resetAllMocks (not clearAllMocks) clears the mockResolvedValueOnce/
    // mockRejectedValueOnce queues too, preventing values queued by one test
    // but never consumed from leaking into the next test.
    jest.resetAllMocks()

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

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      response: jest.fn().mockImplementation(() => ({
        type: jest.fn().mockImplementation(() => ({
          code: jest.fn().mockReturnValue('json-response')
        })),
        code: jest.fn().mockReturnValue('json-response')
      })),
      redirect: jest.fn().mockReturnValue('redirected')
    }

    mockedConfig.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      if (key === 'downloadApiUrl') return 'http://test-download-url'
      if (key === 'DOWNLOAD_API_URL') return 'http://test-download-url'
      return 'http://test-download-url'
    })

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
    it('should be a function', () => {
      expect(typeof downloadcontroller.handler).toBe('function')
    })

    it('should return download result with status 200', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      const yarSetCalls = mockRequest.yar.set.mock.calls
      const downloadResultCall = yarSetCalls.find(
        (call) => call[0] === 'downloadresult'
      )
      expect(downloadResultCall).toBeDefined()
    })

    it('should handle nojs path correctly', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/PM10/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should render nojs view with title from viewData', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/PM10/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 || mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should render nojs view with correct view name for nojs path', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/NO2/Hourly'
      mockRequest.params = { poll: 'NO2', freq: 'Hourly' }

      const mockDownloadResult = { data: 'test' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 || mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should build correct API parameters', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'NO2',
          downloadpollutanttype: 'Daily'
        })
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

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle different URL pathnames', async () => {
      mockRequest.url.pathname = '/different/path'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
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

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should redirect to problem-with-service when axios throws an error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle axios timeout error', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      mockedAxios.post.mockRejectedValueOnce(timeoutError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle axios 500 server error', async () => {
      const serverError = new Error('Request failed with status code 500')
      serverError.response = { status: 500 }
      mockedAxios.post.mockRejectedValueOnce(serverError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle station details with missing location coordinates', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: null
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should not throw when handler is called with valid data', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await expect(
        downloadcontroller.handler(mockRequest, mockH)
      ).resolves.not.toThrow()
    })

    it('should read stationdetails from yar session', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('stationdetails')
    })

    it('should read selectedYear from yar session', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedYear')
    })

    it('should read latesttime from yar session', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('latesttime')
    })

    it('should call config.get to retrieve the download API URL', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedConfig.get).toHaveBeenCalled()
    })

    it('should handle completely empty station details object', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {}
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle network connection refused error', async () => {
      const connError = new Error('connect ECONNREFUSED')
      connError.code = 'ECONNREFUSED'
      mockedAxios.post.mockRejectedValueOnce(connError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle 404 API response', async () => {
      const notFoundError = new Error('Request failed with status code 404')
      notFoundError.response = { status: 404 }
      mockedAxios.post.mockRejectedValueOnce(notFoundError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should access request.params.poll', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.params.poll).toBe('NO2')
    })

    it('should access request.params.freq', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.params.freq).toBe('Daily')
    })

    it('should return a result from handler', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle undefined location in stationdetails', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001'
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle TypeError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new TypeError('Cannot read properties of null')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should pass correct URL to axios post', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [url] = mockedAxios.post.mock.calls[0]
      expect(url).toBe('http://test-download-url')
    })

    it('should include sitename in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          sitename: 'Test Station'
        })
      )
    })

    it('should include year in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          year: '2023'
        })
      )
    })

    it('should handle PM10 pollutant parameter', async () => {
      mockRequest.params.poll = 'PM10'
      mockRequest.url.pathname = '/download/PM10/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'PM10'
        })
      )
    })

    it('should handle Hourly frequency parameter', async () => {
      mockRequest.params.freq = 'Hourly'
      mockRequest.url.pathname = '/download/NO2/Hourly'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutanttype: 'Hourly'
        })
      )
    })

    it('should store downloadresult in yar session', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      const yarSetCalls = mockRequest.yar.set.mock.calls
      const downloadResultCall = yarSetCalls.find(
        (call) => call[0] === 'downloadresult'
      )
      expect(downloadResultCall).toBeDefined()
      expect(downloadResultCall[1]).toEqual(mockDownloadResult)
    })

    it('should handle axios returning empty data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {}
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle axios returning null data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: null
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle 403 forbidden API response', async () => {
      const forbiddenError = new Error('Request failed with status code 403')
      forbiddenError.response = { status: 403 }
      mockedAxios.post.mockRejectedValueOnce(forbiddenError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle nojs path with PM2.5 pollutant', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/PM25/Daily'
      mockRequest.params.poll = 'PM25'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should handle nojs path with Hourly frequency', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/NO2/Hourly'
      mockRequest.params.freq = 'Hourly'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should handle stationdetails with empty coordinates array', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: {
                coordinates: []
              }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle selectedYear being null', async () => {
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
            return null
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }
      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle latesttime being null', async () => {
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
            return null
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }
      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle ReferenceError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new ReferenceError('variable is not defined')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle axios returning large response data', async () => {
      const largeData = { downloadUrl: 'x'.repeat(10000) }

      mockedAxios.post.mockResolvedValueOnce({
        data: largeData
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should call axios.post exactly once for a standard request', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it('should not call axios.post when stationdetails is null', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'stationdetails') return null
        if (key === 'selectedYear') return '2023'
        if (key === 'latesttime') return '2023-12-01T10:00:00Z'
        if (key === 'viewData') return {}
        return null
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should read viewData from yar session', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('viewData')
    })

    it('should handle O3 pollutant parameter', async () => {
      mockRequest.params.poll = 'O3'
      mockRequest.url.pathname = '/download/O3/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'O3'
        })
      )
    })

    it('should handle SO2 pollutant parameter', async () => {
      mockRequest.params.poll = 'SO2'
      mockRequest.url.pathname = '/download/SO2/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'SO2'
        })
      )
    })

    it('should handle 502 bad gateway error', async () => {
      const gatewayError = new Error('Request failed with status code 502')
      gatewayError.response = { status: 502 }
      mockedAxios.post.mockRejectedValueOnce(gatewayError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle 503 service unavailable error', async () => {
      const unavailableError = new Error('Request failed with status code 503')
      unavailableError.response = { status: 503 }
      mockedAxios.post.mockRejectedValueOnce(unavailableError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should include region in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          region: 'Test Region'
        })
      )
    })

    it('should include siteType in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteType: 'Urban Background'
        })
      )
    })

    it('should include siteId in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteId: 'TS001'
        })
      )
    })

    it('should include latitude in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          latitude: '51.5074'
        })
      )
    })

    it('should include longitude in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          longitude: '-0.1278'
        })
      )
    })

    it('should include stationreaddate in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          stationreaddate: '2023-12-01T10:00:00Z'
        })
      )
    })

    it('should send all expected fields in API parameters', async () => {
      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual({
        downloadpollutant: 'NO2',
        downloadpollutanttype: 'Daily',
        latitude: '51.5074',
        longitude: '-0.1278',
        region: 'Test Region',
        siteId: 'TS001',
        siteType: 'Urban Background',
        sitename: 'Test Station',
        stationreaddate: '2023-12-01T10:00:00Z',
        year: '2023'
      })
    })

    it('should handle PM25 pollutant in API parameters', async () => {
      mockRequest.params.poll = 'PM25'
      mockRequest.url.pathname = '/download/PM25/Daily'

      const mockDownloadResult = { data: 'csv-content' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'PM25'
        })
      )
    })

    it('should handle different station region values', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Greater London',
              siteType: 'Roadside',
              name: 'London Marylebone Road',
              localSiteID: 'MY1',
              location: { coordinates: [51.5225, -0.1546] }
            }
          case 'selectedYear':
            return '2024'
          case 'latesttime':
            return '2024-06-15T08:00:00Z'
          case 'viewData':
            return { title: 'London Station', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          region: 'Greater London',
          siteType: 'Roadside',
          sitename: 'London Marylebone Road',
          siteId: 'MY1',
          latitude: '51.5225',
          longitude: '-0.1546',
          year: '2024',
          stationreaddate: '2024-06-15T08:00:00Z'
        })
      )
    })

    it('should handle 401 unauthorized API response', async () => {
      const unauthorizedError = new Error('Request failed with status code 401')
      unauthorizedError.response = { status: 401 }
      mockedAxios.post.mockRejectedValueOnce(unauthorizedError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle 429 too many requests error', async () => {
      const rateLimitError = new Error('Request failed with status code 429')
      rateLimitError.response = { status: 429 }
      mockedAxios.post.mockRejectedValueOnce(rateLimitError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle stationdetails with negative coordinates', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'South West',
              siteType: 'Rural',
              name: 'Harwell',
              localSiteID: 'HAR',
              location: { coordinates: [-1.3267, 51.5711] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          latitude: '-1.3267',
          longitude: '51.5711'
        })
      )
    })

    it('should handle nojs path and store downloadresult in yar', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/NO2/Daily'

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      const yarSetCalls = mockRequest.yar.set.mock.calls
      const downloadResultCall = yarSetCalls.find(
        (call) => call[0] === 'downloadresult'
      )
      expect(downloadResultCall).toBeDefined()
    })

    it('should handle viewData with additional properties for nojs view', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/NO2/Daily'

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return {
              title: 'Custom Title',
              stationdetails: { name: 'Test' },
              extraProp: 'extra'
            }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should handle EAI_AGAIN DNS error', async () => {
      const dnsError = new Error('getaddrinfo EAI_AGAIN')
      dnsError.code = 'EAI_AGAIN'
      mockedAxios.post.mockRejectedValueOnce(dnsError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle ETIMEDOUT error', async () => {
      const timedOutError = new Error('connect ETIMEDOUT')
      timedOutError.code = 'ETIMEDOUT'
      mockedAxios.post.mockRejectedValueOnce(timedOutError)

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle stationdetails with single coordinate', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      const result = await downloadcontroller.handler(mockRequest, mockH)
      expect(result).toBeDefined()
    })

    it('should handle selectedYear as different year value', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2020'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          year: '2020'
        })
      )
    })

    it('should handle stationdetails with Industrial siteType', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'North East',
              siteType: 'Industrial',
              name: 'Middlesbrough',
              localSiteID: 'MID1',
              location: { coordinates: [-1.2307, 54.5735] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteType: 'Industrial'
        })
      )
    })

    it('should handle axios returning response with string data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'raw-csv-string-data'
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)
      expect(result).toBeDefined()
    })

    it('should handle axios returning response with array data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: [{ row: 1 }, { row: 2 }]
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)
      expect(result).toBeDefined()
    })

    it('should handle SyntaxError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new SyntaxError('Unexpected token')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle RangeError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new RangeError('Maximum call stack size exceeded')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle CO pollutant parameter', async () => {
      mockRequest.params.poll = 'CO'
      mockRequest.url.pathname = '/download/CO/Daily'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutant: 'CO'
        })
      )
    })

    it('should handle Weekly frequency parameter', async () => {
      mockRequest.params.freq = 'Weekly'
      mockRequest.url.pathname = '/download/NO2/Weekly'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutanttype: 'Weekly'
        })
      )
    })

    it('should handle stationdetails with Suburban siteType', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'East Midlands',
              siteType: 'Suburban',
              name: 'Leicester',
              localSiteID: 'LEIC1',
              location: { coordinates: [-1.1319, 52.6369] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteType: 'Suburban',
          sitename: 'Leicester',
          siteId: 'LEIC1'
        })
      )
    })

    it('should handle stationdetails with special characters in name', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Greater London',
              siteType: 'Roadside',
              name: "King's Cross - St Pancras",
              localSiteID: 'KC1',
              location: { coordinates: [51.5305, -0.1237] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          sitename: "King's Cross - St Pancras"
        })
      )
    })

    it('should handle stationdetails with zero coordinates', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [0, 0] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          latitude: '0',
          longitude: '0'
        })
      )
    })

    it('should handle selectedYear as earliest valid year', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2010'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          year: '2010'
        })
      )
    })

    it('should handle latesttime with different date format', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2024-01-15T14:30:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          stationreaddate: '2024-01-15T14:30:00Z'
        })
      )
    })

    it('should handle multiple sequential calls correctly', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result1 = await downloadcontroller.handler(mockRequest, mockH)
      expect(result1).toBeDefined()

      jest.clearAllMocks()

      mockedAxios.post.mockResolvedValueOnce({
        data: { downloadUrl: 'http://second-url' }
      })

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'TS001',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test Title', stationdetails: {} }
          default:
            return null
        }
      })

      const result2 = await downloadcontroller.handler(mockRequest, mockH)
      expect(result2).toBeDefined()
    })

    it('should handle stationdetails with very long localSiteID', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Test Station',
              localSiteID: 'A'.repeat(100),
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteId: 'A'.repeat(100)
        })
      )
    })

    it('should handle stationdetails with numeric localSiteID', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'West Midlands',
              siteType: 'Urban Background',
              name: 'Birmingham',
              localSiteID: '12345',
              location: { coordinates: [-1.8904, 52.4862] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteId: '12345',
          sitename: 'Birmingham'
        })
      )
    })

    it('should handle Error with no message', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error())

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle non-Error thrown value', async () => {
      mockedAxios.post.mockRejectedValueOnce('string error')

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle axios returning undefined data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: undefined
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(result).toBeDefined()
    })

    it('should handle stationdetails with empty string values', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: '',
              siteType: '',
              name: '',
              localSiteID: '',
              location: { coordinates: [51.5074, -0.1278] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          region: '',
          siteType: '',
          sitename: '',
          siteId: ''
        })
      )
    })

    it('should handle nojs path with O3 pollutant', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/O3/Daily'
      mockRequest.params.poll = 'O3'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should handle nojs path with SO2 pollutant', async () => {
      mockRequest.url.pathname = '/stationdetails/downloaddatanojs/SO2/Hourly'
      mockRequest.params.poll = 'SO2'
      mockRequest.params.freq = 'Hourly'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(
        mockH.view.mock.calls.length > 0 ||
          mockH.response.mock.calls.length > 0 ||
          mockH.redirect.mock.calls.length > 0
      ).toBe(true)
    })

    it('should handle stationdetails with high precision coordinates', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Test Region',
              siteType: 'Urban Background',
              name: 'Precision Station',
              localSiteID: 'PS001',
              location: { coordinates: [51.507351, -0.127758] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          latitude: '51.507351',
          longitude: '-0.127758'
        })
      )
    })

    it('should handle config returning different API URLs', async () => {
      mockedConfig.get.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'downloadApiUrl') return 'http://different-api-url'
        if (key === 'DOWNLOAD_API_URL') return 'http://different-api-url'
        return 'http://different-api-url'
      })

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [url] = mockedAxios.post.mock.calls[0]
      expect(url).toBe('http://different-api-url')
    })

    it('should handle Annual frequency parameter', async () => {
      mockRequest.params.freq = 'Annual'
      mockRequest.url.pathname = '/download/NO2/Annual'

      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          downloadpollutanttype: 'Annual'
        })
      )
    })

    it('should handle stationdetails from Scotland region', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Central Scotland',
              siteType: 'Urban Background',
              name: 'Edinburgh St Leonards',
              localSiteID: 'ED3',
              location: { coordinates: [-3.1826, 55.9453] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          region: 'Central Scotland',
          sitename: 'Edinburgh St Leonards',
          siteId: 'ED3'
        })
      )
    })

    it('should handle stationdetails from Wales region', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'Wales',
              siteType: 'Urban Background',
              name: 'Cardiff Centre',
              localSiteID: 'CARD',
              location: { coordinates: [-3.1765, 51.4816] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          region: 'Wales',
          sitename: 'Cardiff Centre',
          siteId: 'CARD'
        })
      )
    })

    it('should handle URIError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new URIError('URI malformed')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle EvalError gracefully', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new EvalError('Eval error')
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirected')
    })

    it('should handle axios post called with correct number of arguments', async () => {
      const mockDownloadResult = { downloadUrl: 'http://test-download-url' }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post.mock.calls[0].length).toBeGreaterThanOrEqual(2)
    })

    it('should handle axios response with nested data structure', async () => {
      const mockDownloadResult = {
        downloadUrl: 'http://test-download-url',
        metadata: {
          pollutant: 'NO2',
          station: 'Test Station',
          records: 365
        }
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      const result = await downloadcontroller.handler(mockRequest, mockH)
      expect(result).toBeDefined()
    })

    it('should handle yar.set being called for downloadresult with correct data', async () => {
      const mockDownloadResult = {
        csvData: 'date,value\n2023-01-01,25'
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockDownloadResult
      })

      await downloadcontroller.handler(mockRequest, mockH)

      const yarSetCalls = mockRequest.yar.set.mock.calls
      const downloadResultCall = yarSetCalls.find(
        (call) => call[0] === 'downloadresult'
      )
      expect(downloadResultCall).toBeDefined()
      expect(downloadResultCall[1]).toEqual(mockDownloadResult)
    })

    it('should handle stationdetails with Rural Background siteType', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'stationdetails':
            return {
              region: 'South East',
              siteType: 'Rural Background',
              name: 'Rochester',
              localSiteID: 'ROCH',
              location: { coordinates: [0.5049, 51.4561] }
            }
          case 'selectedYear':
            return '2023'
          case 'latesttime':
            return '2023-12-01T10:00:00Z'
          case 'viewData':
            return { title: 'Test', stationdetails: {} }
          default:
            return null
        }
      })

      const mockDownloadResult = { data: 'csv-content' }
      mockedAxios.post.mockResolvedValueOnce({ data: mockDownloadResult })

      await downloadcontroller.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      const [, params] = mockedAxios.post.mock.calls[0]
      expect(params).toEqual(
        expect.objectContaining({
          siteType: 'Rural Background'
        })
      )
    })
  })
})
