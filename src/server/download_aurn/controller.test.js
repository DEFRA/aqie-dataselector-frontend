import { downloadAurnController } from './controller.js'
import { config } from '~/src/config/config.js'
import axios from 'axios'

// Mock logger dependencies first (before other imports)
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

// Mock config and axios
jest.mock('~/src/config/config.js')
jest.mock('axios')
jest.mock('@hapi/wreck')

describe('downloadAurnController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockRequest = {
      params: {
        year: '2024'
      },
      url: {
        pathname: '/download_aurn/2024'
      },
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

    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        formattedPollutants:
          'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
        selectedlocation: ['England'],
        Location: 'Country',
        downloadViewData: {
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
    it('should successfully download AURN data and return result URL for JS route', async () => {
      const mockDownloadResponse = { data: 'job-123' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-123'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenCalledTimes(2)
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
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
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadaurnresult',
        'https://api.example.com/results/job-123'
      )
      expect(mockH.response).toHaveBeenCalledWith(
        'https://api.example.com/results/job-123'
      )
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    }, 10000)

    it('should render no-JS template for no-JS route', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-nojs' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-nojs'
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
          pageTitle: 'Test Download Page',
          heading: 'Test Heading',
          texts: ['Test text'],
          stationcount: '50',
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2024'],
          downloadresult: 'https://api.example.com/results/job-nojs'
        }
      )
    }, 10000)
  })

  describe('API parameter construction', () => {
    it('should construct correct API params with all required fields including regiontype', async () => {
      const mockDownloadResponse = { data: 'job-params' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-params'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenNthCalledWith(1, expect.any(String), {
        pollutantName: 'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
        dataSource: 'AURN',
        Region: 'England',
        regiontype: 'Country',
        Year: '2024',
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorSingle'
      })
    }, 10000)

    it('should handle LocalAuthority region type', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['1,2,3'],
          Location: 'LocalAuthority',
          downloadViewData: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-la' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-la'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          Region: '1,2,3',
          regiontype: 'LocalAuthority'
        })
      )
    }, 10000)
  })

  describe('session management', () => {
    it('should get all required session variables', async () => {
      const mockDownloadResponse = { data: 'job-session' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/session'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockRequest.yar.get).toHaveBeenCalledWith('formattedPollutants')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('Location')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('downloadViewData')
    }, 10000)

    it('should set downloadaurnresult in session', async () => {
      const resultUrl = 'https://api.example.com/results/download-data'
      const mockDownloadResponse = { data: 'job-session-set' }
      const mockStatusResponse = { data: { status: 'Completed', resultUrl } }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

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
    it('should detect JS route from URL pathname', async () => {
      mockRequest.url.pathname = '/download_aurn/2024'

      const mockDownloadResponse = { data: 'job-js' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-js'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.view).not.toHaveBeenCalled()
    }, 10000)

    it('should detect no-JS route from URL pathname', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-nojs-detect' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-nojs-detect'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.view).toHaveBeenCalled()
      expect(mockH.response).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('view data handling', () => {
    it('should merge downloadViewData with download result for no-JS template', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'

      const mockDownloadResponse = { data: 'job-merge' }
      const resultUrl = 'https://api.example.com/results/job-merge'
      const mockStatusResponse = {
        data: { status: 'Completed', resultUrl }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          downloadresult: resultUrl,
          pageTitle: 'Test Download Page',
          heading: 'Test Heading'
        })
      )
    }, 10000)

    it('should handle missing downloadViewData gracefully', async () => {
      mockRequest.url.pathname = '/download_aurn_nojs/2024'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['England'],
          Location: 'Country',
          downloadViewData: undefined
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
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.view).toHaveBeenCalled()
    }, 10000)
  })

  describe('location handling', () => {
    it('should handle multiple locations in selectedlocation array', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5,PM10',
          selectedlocation: ['England', 'Wales', 'Scotland'],
          Location: 'Country',
          downloadViewData: { pageTitle: 'Test' }
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-789' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-789'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/download',
        expect.objectContaining({
          Region: 'England,Wales,Scotland',
          regiontype: 'Country'
        })
      )
    }, 10000)
  })

  // describe('error handling', () => {
  //   it('should handle download API errors', async () => {
  //     axios.post.mockRejectedValueOnce(new Error('Download API error'))

  //     const result = await downloadAurnController.handler(mockRequest, mockH)

  //     expect(mockH.response).toHaveBeenCalledWith({ error: 'An error occurred' })
  //     expect(mockH.code).toHaveBeenCalledWith(500)
  //   })

  //   it('should handle polling API errors', async () => {
  //     const mockDownloadResponse = { data: 'job-error' }
  //     axios.post
  //       .mockResolvedValueOnce(mockDownloadResponse)
  //       .mockRejectedValueOnce(new Error('Polling API error'))

  //     const result = await downloadAurnController.handler(mockRequest, mockH)

  //     expect(mockH.response).toHaveBeenCalledWith({ error: 'An error occurred' })
  //     expect(mockH.code).toHaveBeenCalledWith(500)
  //   })

  //   it('should handle network timeout errors', async () => {
  //     const timeoutError = new Error('Network timeout')
  //     timeoutError.code = 'ECONNABORTED'
  //     axios.post.mockRejectedValueOnce(timeoutError)

  //     const result = await downloadAurnController.handler(mockRequest, mockH)

  //     expect(mockH.response).toHaveBeenCalledWith({ error: 'An error occurred' })
  //     expect(mockH.code).toHaveBeenCalledWith(500)
  //   })
  // })

  describe('polling mechanism', () => {
    it('should continue polling until status is Completed', async () => {
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
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponses[0])
        .mockResolvedValueOnce(mockStatusResponses[1])
        .mockResolvedValueOnce(mockStatusResponses[2])

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenCalledTimes(4)
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/status',
        { jobID: 'job-poll' }
      )
    }, 15000)
  })
})
