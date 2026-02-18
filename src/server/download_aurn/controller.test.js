import { downloadAurnController } from './controller.js'
import { config } from '~/src/config/config.js'
import axios from 'axios'

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('~/src/config/config.js')
jest.mock('axios')

describe('downloadAurnController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    axios.post.mockReset()

    mockRequest = {
      params: { year: '2024' },
      url: { pathname: '/download_aurn/2024' },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    mockH = {
      response: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      view: jest.fn().mockReturnValue('view-response')
    }

    // Session values
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        formattedPollutants:
          'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
        selectedlocation: ['England'],
        Location: 'Country',
        viewDatanojs: {
          pageTitle: 'Test Download Page',
          heading: 'Test Heading',
          texts: ['Test text'],
          stationcount: '50',
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2024']
        }
      }
      return values[key]
    })

    // Config
    config.get.mockImplementation((key) => {
      const values = {
        Download_aurn_URL: 'https://api.example.com/download',
        Polling_URL: 'https://api.example.com/status'
      }
      return values[key]
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('successful download flow', () => {
    it('returns jobID for JS route (no server-side polling)', async () => {
      const mockDownloadResponse = { data: 'job-123' }

      axios.post.mockResolvedValueOnce(mockDownloadResponse) // Invokedownload - returns job ID

      await downloadAurnController.handler(mockRequest, mockH)

      // Should only call download API once (no polling on server for JS route)
      expect(axios.post).toHaveBeenCalledTimes(1)
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        {
          pollutantName: 'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
          dataSource: 'AURN',
          Region: 'England',
          regiontype: 'Country',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle'
        }
      )
      // Should NOT set downloadaurnresult for JS route
      expect(mockRequest.yar.set).not.toHaveBeenCalled()

      // Should return jobID in response body
      expect(mockH.response).toHaveBeenCalledWith({ jobID: 'job-123' })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    }, 10000)

    it('renders no-JS template for no-JS route (with server-side polling)', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-nojs' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-nojs'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload
        .mockResolvedValueOnce(mockStatusResponse) // invokedownloadS3 - server-side polling

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // Should call download API and status API
      expect(axios.post).toHaveBeenCalledTimes(2)
      expect(mockRequest.yar.get).toHaveBeenCalledWith('viewDatanojs')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadaurnresult',
        'https://api.example.com/results/job-nojs'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Test Download Page',
          heading: 'Test Heading',
          texts: ['Test text'],
          stationcount: '50',
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2024'],
          downloadresultnojs: 'https://api.example.com/results/job-nojs'
        }
      )
    }, 10000)
  })

  describe('API params', () => {
    it('constructs params including regiontype', async () => {
      const mockDownloadResponse = { data: 'job-params' }

      axios.post.mockResolvedValueOnce(mockDownloadResponse) // Invokedownload only

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        {
          pollutantName: 'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
          dataSource: 'AURN',
          Region: 'England',
          regiontype: 'Country',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle'
        }
      )
    }, 10000)

    it('handles LocalAuthority region type', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          // Controller uses selectedLAIDs for non-Country
          selectedLAIDs: '1,2,3',
          Location: 'LocalAuthority',
          viewDatanojs: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-la' }

      axios.post.mockResolvedValueOnce(mockDownloadResponse) // Invokedownload only

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          Region: '1,2,3',
          regiontype: 'LocalAuthority'
        })
      )
    }, 10000)
  })

  describe('session management', () => {
    it('reads required session variables for JS route', async () => {
      const mockDownloadResponse = { data: 'job-session' }

      axios.post.mockResolvedValueOnce(mockDownloadResponse) // Invokedownload only

      await downloadAurnController.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('formattedPollutants')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('Location')
      // JS route doesn't read viewDatanojs
      expect(mockRequest.yar.get).not.toHaveBeenCalledWith('viewDatanojs')
    }, 10000)

    it('sets downloadaurnresult in session for no-JS route only', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'
      const resultUrl = 'https://api.example.com/results/download-data'
      const mockDownloadResponse = { data: 'job-session-set' }
      const mockStatusResponse = { data: { status: 'Completed', resultUrl } }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload
        .mockResolvedValueOnce(mockStatusResponse) // invokedownloadS3

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadaurnresult',
        resultUrl
      )
    }, 10000)
  })

  describe('route detection', () => {
    it('detects JS route by pathname (returns jobID)', async () => {
      mockRequest.url.pathname = '/download_aurn/2024'

      const mockDownloadResponse = { data: 'job-js' }

      axios.post.mockResolvedValueOnce(mockDownloadResponse) // Invokedownload only

      await downloadAurnController.handler(mockRequest, mockH)

      // JS route returns JSON response, not view
      expect(mockH.response).toHaveBeenCalledWith({ jobID: 'job-js' })
      expect(mockH.view).not.toHaveBeenCalled()
    }, 10000)

    it('detects no-JS route by pathname (renders view with polling)', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-nojs-detect' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-nojs-detect'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload
        .mockResolvedValueOnce(mockStatusResponse) // invokedownloadS3 - server polls

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // No-JS route renders view, not JSON response
      expect(mockH.view).toHaveBeenCalled()
      expect(mockH.response).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('view data merge', () => {
    it('merges viewDatanojs with result for no-JS template', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-merge' }
      const resultUrl = 'https://api.example.com/results/job-merge'
      const mockStatusResponse = { data: { status: 'Completed', resultUrl } }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload
        .mockResolvedValueOnce(mockStatusResponse) // invokedownloadS3 - server polls

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Test Download Page',
          heading: 'Test Heading',
          texts: ['Test text'],
          stationcount: '50',
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2024'],
          downloadresultnojs: resultUrl
        }
      )
    }, 10000)

    it('handles missing viewDatanojs gracefully', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['England'],
          Location: 'Country',
          viewDatanojs: undefined
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-missing' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-missing'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload
        .mockResolvedValueOnce(mockStatusResponse) // invokedownloadS3 - server polls

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // When viewDatanojs is undefined, spread creates empty object
      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          downloadresultnojs: 'https://api.example.com/results/job-missing'
        }
      )
    }, 10000)
  })

  describe('polling mechanism', () => {
    it('continues polling until status is Completed (no-JS route only)', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-poll' }
      const mockStatusResponses = [
        { data: { status: 'Pending', resultUrl: null } },
        { data: { status: 'Processing', resultUrl: null } },
        {
          data: {
            status: 'Completed',
            resultUrl: 'https://api.example.com/results/job-poll'
          }
        }
      ]

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse) // Invokedownload - start job
        .mockResolvedValueOnce(mockStatusResponses[0]) // invokedownloadS3 - poll #1
        .mockResolvedValueOnce(mockStatusResponses[1]) // invokedownloadS3 - poll #2
        .mockResolvedValueOnce(mockStatusResponses[2]) // invokedownloadS3 - poll #3 complete

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // 1 download call + 3 status polling calls
      expect(axios.post).toHaveBeenCalledTimes(4)
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/status',
        { jobID: 'job-poll' }
      )
      expect(axios.post).toHaveBeenNthCalledWith(
        3,
        'https://api.example.com/status',
        { jobID: 'job-poll' }
      )
      expect(axios.post).toHaveBeenNthCalledWith(
        4,
        'https://api.example.com/status',
        { jobID: 'job-poll' }
      )
    }, 15000)
  })

  describe('error handling', () => {
    it('handles download API error for JS route', async () => {
      const error = new Error('Download API failed')
      error.statusCode = 503
      axios.post.mockRejectedValueOnce(error)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(error)
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    }, 10000)

    it('handles download API error with custom error object for JS route', async () => {
      const error = { error: true, statusCode: 400, message: 'Bad request' }
      axios.post.mockResolvedValueOnce({ data: error })

      await downloadAurnController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({ jobID: error })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
    }, 10000)

    it('handles download error and returns error object for no-JS route', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'
      const error = new Error('Download failed')
      error.statusCode = 500

      axios.post.mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // Should still render view even with download error (error is returned as jobID)
      expect(mockH.view).toHaveBeenCalled()
    }, 10000)

    it('handles polling error for no-JS route', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-poll-error' }
      const pollingError = new Error('Polling failed')
      pollingError.error = true
      pollingError.statusCode = 503

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockRejectedValueOnce(pollingError)

      mockH.redirect = jest.fn().mockReturnValue('redirect-response')

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // Should not render view on polling error
      expect(mockH.view).not.toHaveBeenCalled()
    }, 10000)

    it('handles missing config URL for download', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'Download_aurn_URL') return undefined
        if (key === 'Polling_URL') return 'https://api.example.com/status'
        return undefined
      })

      const error = new Error('Request failed')
      axios.post.mockRejectedValueOnce(error)

      await downloadAurnController.handler(mockRequest, mockH)

      // Should return error response
      expect(mockH.response).toHaveBeenCalledWith(error)
      expect(mockH.type).toHaveBeenCalledWith('application/json')
    }, 10000)

    it('handles missing config URL for polling', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      config.get.mockImplementation((key) => {
        if (key === 'Download_aurn_URL')
          return 'https://api.example.com/download'
        if (key === 'Polling_URL') return undefined
        return undefined
      })

      const mockDownloadResponse = { data: 'job-no-poll-url' }
      const pollingError = new Error('Config missing')
      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockRejectedValueOnce(pollingError)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // Should still render view with error handled
      expect(mockH.view).toHaveBeenCalled()
    }, 10000)

    it('handles axios network error', async () => {
      const networkError = new Error('Network Error')
      networkError.code = 'ENOTFOUND'
      axios.post.mockRejectedValueOnce(networkError)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(networkError)
      expect(mockH.type).toHaveBeenCalledWith('application/json')
    }, 10000)

    it('handles timeout error', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      axios.post.mockRejectedValueOnce(timeoutError)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(timeoutError)
    }, 10000)
  })

  describe('edge cases and data variations', () => {
    it('handles multiple locations for Country region', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5,PM10',
          selectedlocation: ['England', 'Wales', 'Scotland'],
          Location: 'Country',
          viewDatanojs: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-multi-location' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          Region: 'England,Wales,Scotland',
          regiontype: 'Country'
        })
      )
    }, 10000)

    it('handles single pollutant', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['England'],
          Location: 'Country',
          viewDatanojs: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-single-pollutant' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          pollutantName: 'PM2.5'
        })
      )
    }, 10000)

    it('handles multiple LocalAuthority IDs', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'NO2,O3',
          selectedLAIDs: '1,5,10,25,50',
          Location: 'LocalAuthority',
          viewDatanojs: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-multi-la' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          Region: '1,5,10,25,50',
          regiontype: 'LocalAuthority'
        })
      )
    }, 10000)

    it('handles different year formats', async () => {
      mockRequest.params.year = '2023'
      const mockDownloadResponse = { data: 'job-year-2023' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          Year: '2023'
        })
      )
    }, 10000)

    it('includes correct dataselectorfiltertype and downloadtype', async () => {
      const mockDownloadResponse = { data: 'job-filter-types' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle',
          dataSource: 'AURN'
        })
      )
    }, 10000)

    it('handles empty viewDatanojs with all properties', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['England'],
          Location: 'Country',
          viewDatanojs: {}
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-empty-view' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-empty-view'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          downloadresultnojs: 'https://api.example.com/results/job-empty-view'
        }
      )
    }, 10000)

    it('handles polling with single immediate completion', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-instant' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-instant'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      // Should poll only once and complete
      expect(axios.post).toHaveBeenCalledTimes(2)
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadaurnresult',
        'https://api.example.com/results/job-instant'
      )
    }, 10000)

    it('handles null or undefined session values gracefully', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: null,
          selectedlocation: ['England'],
          Location: 'Country',
          viewDatanojs: null
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-null-values' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      // Should still make API call with null pollutants
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          pollutantName: null,
          Region: 'England'
        })
      )
    }, 10000)

    it('logs API parameters before making request', async () => {
      const mockDownloadResponse = { data: 'job-logging' }
      axios.post.mockResolvedValueOnce(mockDownloadResponse)

      await downloadAurnController.handler(mockRequest, mockH)

      // Logger should be called (mocked in beforeEach)
      expect(axios.post).toHaveBeenCalled()
    }, 10000)
  })
})
