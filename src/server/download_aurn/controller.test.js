import { downloadAurnController } from './controller.js'
import { config } from '~/src/config/config.js'
import axios from 'axios'
//import Wreck from '@hapi/wreck'

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
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
    mockH = {
      response: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        formattedPollutants:
          'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide',
        selectedlocation: ['England']
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
    it('should successfully download AURN data and return result URL', async () => {
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

    it('should set correct response headers and status code', async () => {
      const resultUrl = 'https://api.example.com/results/job-123'
      const mockDownloadResponse = { data: 'job-123' }
      const mockStatusResponse = { data: { status: 'Completed', resultUrl } }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
      expect(mockH.response).toHaveBeenCalledWith(resultUrl)
    }, 10000)
  })

  describe('API parameter construction', () => {
    it('should construct correct API params with all required fields', async () => {
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
        Year: '2024',
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorSingle'
      })
    }, 10000)

    it('should handle different years in API params', async () => {
      mockRequest.params.year = '2022'

      const mockDownloadResponse = { data: 'job-2022' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-2022'
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
          Year: '2022'
        })
      )
    }, 10000)

    it('should use config to get download URL', async () => {
      const mockDownloadResponse = { data: 'job-config' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-config'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(config.get).toHaveBeenCalledWith('Download_aurn_URL')
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/download',
        expect.any(Object)
      )
    }, 10000)

    it('should use config to get polling URL', async () => {
      const mockDownloadResponse = { data: 'job-polling-url' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/polling'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(config.get).toHaveBeenCalledWith('Polling_URL')
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/status',
        expect.any(Object)
      )
    }, 10000)
  })

  describe('session management', () => {
    it('should get formattedPollutants from session', async () => {
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
    }, 10000)

    it('should get selectedlocation from session', async () => {
      const mockDownloadResponse = { data: 'job-location' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/location'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
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

  describe('location handling', () => {
    it('should handle multiple locations', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5,PM10',
          selectedlocation: ['England', 'Wales', 'Scotland']
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
        {
          pollutantName: 'PM2.5,PM10',
          dataSource: 'AURN',
          Region: 'England,Wales,Scotland',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle'
        }
      )
    }, 10000)

    it('should handle single location', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5',
          selectedlocation: ['Wales']
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-single-loc' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/single-loc'
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
          Region: 'Wales'
        })
      )
    }, 10000)

    it('should join multiple locations with comma', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'Ozone',
          selectedlocation: ['England', 'Wales', 'Scotland', 'Northern Ireland']
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-join' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/join'
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
          Region: 'England,Wales,Scotland,Northern Ireland'
        })
      )
    }, 10000)
  })

  describe('polling mechanism', () => {
    it('should poll status endpoint with correct jobID', async () => {
      const mockDownloadResponse = { data: 'job-456' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-456'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/status',
        {
          jobID: 'job-456'
        }
      )
    }, 10000)

    it('should wait 20 seconds before polling status', async () => {
      const mockDownloadResponse = { data: 'job-wait' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/job-wait'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)

      jest.advanceTimersByTime(20000)

      await promise
      await jest.runAllTimersAsync()

      expect(axios.post).toHaveBeenCalled()
    }, 10000)

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
    }, 15000)

    it('should handle status response with different status values before Completed', async () => {
      const mockDownloadResponse = { data: 'job-status-vals' }
      const mockStatusResponses = [
        { data: { status: 'Queued', resultUrl: null } },
        { data: { status: 'Running', resultUrl: null } },
        {
          data: {
            status: 'Completed',
            resultUrl: 'https://api.example.com/results/completed'
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
      expect(mockH.response).toHaveBeenCalledWith(
        'https://api.example.com/results/completed'
      )
    }, 15000)
  })

  describe('error handling', () => {
    it('should return error response on download API failure', async () => {
      const error = new Error('Download failed')
      axios.post.mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    }, 10000)

    it('should return error response on status polling failure', async () => {
      const mockDownloadResponse = { data: 'job-fail' }
      const error = new Error('Status polling failed')

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    }, 10000)

    it('should handle network timeout error', async () => {
      const error = new Error('Request timeout')
      error.code = 'ECONNABORTED'
      axios.post.mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    }, 10000)

    it('should handle DNS resolution error', async () => {
      const error = new Error('getaddrinfo ENOTFOUND')
      error.code = 'ENOTFOUND'
      axios.post.mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    }, 10000)

    it('should handle connection refused error', async () => {
      const error = new Error('Connection refused')
      error.code = 'ECONNREFUSED'
      axios.post.mockRejectedValueOnce(error)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    }, 10000)
  })

  describe('edge cases', () => {
    it('should handle null download response data', async () => {
      const mockDownloadResponse = { data: null }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/null'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenCalled()
    }, 10000)

    it('should handle status response without resultUrl initially', async () => {
      const mockDownloadResponse = { data: 'job-no-url-init' }
      const mockStatusResponses = [
        { data: { status: 'Processing' } },
        {
          data: {
            status: 'Completed',
            resultUrl: 'https://api.example.com/results/final'
          }
        }
      ]

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponses[0])
        .mockResolvedValueOnce(mockStatusResponses[1])

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith(
        'https://api.example.com/results/final'
      )
    }, 15000)

    it('should handle very long polling with 10 status checks', async () => {
      const mockDownloadResponse = { data: 'job-long' }
      const mockStatusResponses = Array(9)
        .fill(null)
        .map((_, i) => ({
          data: {
            status: i < 8 ? 'Processing' : 'Completed',
            resultUrl:
              i === 8 ? 'https://api.example.com/results/job-long' : null
          }
        }))

      axios.post.mockResolvedValueOnce(mockDownloadResponse)
      mockStatusResponses.forEach((response) => {
        axios.post.mockResolvedValueOnce(response)
      })

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenCalledTimes(10)
    }, 20000)

    it('should handle special characters in pollutant names', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: 'PM2.5 (μg/m³),NO2 (ppb)',
          selectedlocation: ['England']
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-special' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/special'
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
          pollutantName: 'PM2.5 (μg/m³),NO2 (ppb)'
        })
      )
    }, 10000)

    it('should handle empty formatted pollutants string', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          formattedPollutants: '',
          selectedlocation: ['England']
        }
        return values[key]
      })

      const mockDownloadResponse = { data: 'job-empty' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/empty'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(axios.post).toHaveBeenCalled()
    }, 10000)

    it('should handle year with leading zeros', async () => {
      mockRequest.params.year = '0024'

      const mockDownloadResponse = { data: 'job-year-format' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/year-format'
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
          Year: '0024'
        })
      )
    }, 10000)
  })

  describe('response handling', () => {
    it('should return chained response object', async () => {
      const mockDownloadResponse = { data: 'job-chain' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/chain'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.type).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalled()
    }, 10000)

    it('should return the result URL in response body', async () => {
      const resultUrl = 'https://api.example.com/results/body-test'
      const mockDownloadResponse = { data: 'job-body' }
      const mockStatusResponse = { data: { status: 'Completed', resultUrl } }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      expect(mockH.response).toHaveBeenCalledWith(resultUrl)
    }, 10000)

    it('should call response, type, and code in correct order', async () => {
      const mockDownloadResponse = { data: 'job-order' }
      const mockStatusResponse = {
        data: {
          status: 'Completed',
          resultUrl: 'https://api.example.com/results/order'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockDownloadResponse)
        .mockResolvedValueOnce(mockStatusResponse)

      const promise = downloadAurnController.handler(mockRequest, mockH)
      await jest.runAllTimersAsync()
      await promise

      const responseCallOrder = mockH.response.mock.invocationCallOrder[0]
      const typeCallOrder = mockH.type.mock.invocationCallOrder[0]
      const codeCallOrder = mockH.code.mock.invocationCallOrder[0]

      expect(responseCallOrder).toBeLessThan(typeCallOrder)
      expect(typeCallOrder).toBeLessThan(codeCallOrder)
    }, 10000)
  })
})
