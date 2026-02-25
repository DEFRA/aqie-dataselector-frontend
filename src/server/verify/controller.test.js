import { verifyController } from './controller.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

// Mock external dependencies
jest.mock('axios')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

// Mock logger to prevent test output noise
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}))

// Mock console methods
const originalConsole = console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
})

afterAll(() => {
  global.console = originalConsole
})

describe('verifyController', () => {
  let mockRequest
  let mockH
  let mockAxios
  let mockConfig

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      params: {
        id: 'test-job-id-123',
        timestamp: Date.now().toString()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response')
    }

    mockAxios = jest.mocked(axios.post)
    mockConfig = jest.mocked(config.get)

    // Set up default mock return value for config.get
    mockConfig.mockImplementation((key) => {
      if (key === 'downloadEmailUrl') {
        return 'https://api.example.com/download'
      }
      return null
    })

    // Set up default mock response for axios.post
    mockAxios.mockResolvedValue({
      data: { url: 'https://example.com/download/file.csv' },
      status: 200
    })
  })

  describe('Missing parameters', () => {
    it('should return error view when id is missing', async () => {
      mockRequest.params.id = undefined

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    })

    it('should return error view when timestamp is missing', async () => {
      mockRequest.params.timestamp = undefined

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    })

    it('should return error view when both id and timestamp are missing', async () => {
      mockRequest.params.id = undefined
      mockRequest.params.timestamp = undefined

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    })
  })

  describe('Invalid timestamp', () => {
    it('should return expired view when timestamp is not a number', async () => {
      mockRequest.params.timestamp = 'invalid-timestamp'

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        error:
          'This download link is no longer valid. Links expire after 2 days.',
        id: null,
        timestamp: null,
        isExpired: true
      })
    })

    it('should return expired view when timestamp is NaN', async () => {
      mockRequest.params.timestamp = 'abc123'

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        error:
          'This download link is no longer valid. Links expire after 2 days.',
        id: null,
        timestamp: null,
        isExpired: true
      })
    })
  })

  describe('Expired timestamp', () => {
    it('should return expired view when timestamp is more than 2 days old', async () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
      mockRequest.params.timestamp = threeDaysAgo.toString()

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        error:
          'This download link is no longer valid. Links expire after 2 days.',
        id: null,
        timestamp: null,
        isExpired: true
      })
    })

    it('should return expired view when timestamp is exactly 2 days + 1 millisecond old', async () => {
      const twoDaysAndOneMs = Date.now() - (2 * 24 * 60 * 60 * 1000 + 1)
      mockRequest.params.timestamp = twoDaysAndOneMs.toString()

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        error:
          'This download link is no longer valid. Links expire after 2 days.',
        id: null,
        timestamp: null,
        isExpired: true
      })
    })
  })

  describe('Valid timestamp - successful download', () => {
    it('should return success view with download URL when timestamp is valid', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const mockDownloadUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      mockAxios.mockResolvedValue({ data: mockDownloadUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: 'test-job-id-123' }
      )

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: { data: mockDownloadUrl }
      })
    })

    it('should work with timestamp within 2 days', async () => {
      const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000
      mockRequest.params.timestamp = oneDayAgo.toString()

      const mockDownloadUrl = 'https://download.example.com/data.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockDownloadUrl
      })
    })

    it('should work with timestamp exactly at 2 days boundary', async () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      mockRequest.params.timestamp = twoDaysAgo.toString()

      const mockDownloadUrl = 'https://cdn.example.com/file.zip'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockDownloadUrl
      })
    })
  })

  describe('API error handling', () => {
    it('should handle axios error and return error response', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const mockError = new Error('Network error')
      mockAxios.mockRejectedValue(mockError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockError
      })
    })

    it('should handle API timeout error', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      mockAxios.mockRejectedValue(timeoutError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: timeoutError
      })
    })

    it('should handle 404 error from API', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const notFoundError = new Error('Request failed with status code 404')
      notFoundError.response = { status: 404, data: 'Not found' }
      mockAxios.mockRejectedValue(notFoundError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: notFoundError
      })
    })

    it('should handle 500 error from API', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const serverError = new Error('Request failed with status code 500')
      serverError.response = { status: 500, data: 'Internal server error' }
      mockAxios.mockRejectedValue(serverError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: serverError
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string id', async () => {
      mockRequest.params.id = ''

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    })

    it('should handle empty string timestamp', async () => {
      mockRequest.params.timestamp = ''

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    })

    it('should handle future timestamp', async () => {
      const futureTimestamp = Date.now() + 1 * 24 * 60 * 60 * 1000
      mockRequest.params.timestamp = futureTimestamp.toString()

      const mockDownloadUrl = 'https://example.com/download.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockDownloadUrl
      })
    })

    it('should handle very large timestamp', async () => {
      mockRequest.params.timestamp = '9999999999999'

      const mockDownloadUrl = 'https://example.com/file.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
    })

    it('should handle negative timestamp', async () => {
      mockRequest.params.timestamp = '-1000000'

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        error:
          'This download link is no longer valid. Links expire after 2 days.',
        id: null,
        timestamp: null,
        isExpired: true
      })
    })

    it('should handle special characters in id', async () => {
      mockRequest.params.id = 'test-id-with-special-chars-!@#$%'
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const mockDownloadUrl = 'https://example.com/download.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: 'test-id-with-special-chars-!@#$%' }
      )
    })

    it('should handle very long id', async () => {
      mockRequest.params.id = 'a'.repeat(1000)
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const mockDownloadUrl = 'https://example.com/download.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: 'a'.repeat(1000) }
      )
    })
  })

  describe('Config integration', () => {
    it('should use config to get download email URL', async () => {
      const currentTimestamp = Date.now().toString()
      mockRequest.params.timestamp = currentTimestamp

      const customApiUrl = 'https://custom.api.com/email-download'
      mockConfig.mockImplementation((key) => {
        if (key === 'downloadEmailUrl') {
          return customApiUrl
        }
        return null
      })

      const mockDownloadUrl = 'https://example.com/file.csv'
      mockAxios.mockResolvedValue(mockDownloadUrl)

      await verifyController.handler(mockRequest, mockH)

      expect(mockConfig).toHaveBeenCalledWith('downloadEmailUrl')
      expect(mockAxios).toHaveBeenCalledWith(customApiUrl, {
        jobID: 'test-job-id-123'
      })
    })
  })
})
