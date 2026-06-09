import { verifyController } from './controller.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import { HTTP_REQUEST_TIMEOUT_MS } from '~/src/server/common/constants/magic-numbers.js'

jest.mock('axios')
jest.mock('@hapi/wreck')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}))

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

// Shared expected payload for all expired/invalid timestamp cases
const expiredViewPayload = {
  pageTitle: 'Link Expired',
  heading: 'Your link has expired',
  message:
    'The download link had expired. Download links expire after 48 hours.',
  downloadEmailUrl: null,
  id: null,
  timestamp: null,
  isExpired: true
}

describe('verifyController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      params: {
        id: 'test-job-id-123',
        timestamp: Date.now().toString()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    jest.mocked(config.get).mockImplementation((key) => {
      if (key === 'downloadEmailUrl') return 'https://api.example.com/download'
      return null
    })

    jest.mocked(axios.post).mockResolvedValue({
      data: 'https://example.com/download/file.csv'
    })

    // Mock axios.get for S3 URL validation
    jest.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { destroy: jest.fn() }
    })
  })

  // ─── Missing / empty parameters ────────────────────────────────────────────

  describe('Missing parameters', () => {
    const missingPayload = {
      pageTitle: 'Download',
      heading: 'Invalid Request',
      error: 'Missing required parameters: id and timestamp',
      id: null,
      timestamp: null
    }

    it('should return error view when id is undefined', async () => {
      mockRequest.params.id = undefined
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('verify/index', missingPayload)
    })

    it('should return error view when timestamp is undefined', async () => {
      mockRequest.params.timestamp = undefined
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('verify/index', missingPayload)
    })

    it('should return error view when both id and timestamp are undefined', async () => {
      mockRequest.params.id = undefined
      mockRequest.params.timestamp = undefined
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('verify/index', missingPayload)
    })

    it('should return error view when id is an empty string', async () => {
      mockRequest.params.id = ''
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('verify/index', missingPayload)
    })

    it('should return error view when timestamp is an empty string', async () => {
      mockRequest.params.timestamp = ''
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('verify/index', missingPayload)
    })
  })

  // ─── Invalid / expired timestamp ───────────────────────────────────────────

  describe('Invalid timestamp (non-numeric)', () => {
    it('should return expired view when timestamp is a plain string', async () => {
      mockRequest.params.timestamp = 'invalid-timestamp'
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'verify/index_exp',
        expiredViewPayload
      )
    })

    it('should return expired view when timestamp is an alphanumeric string', async () => {
      mockRequest.params.timestamp = 'abc123'
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'verify/index_exp',
        expiredViewPayload
      )
    })
  })

  describe('Expired timestamp (too old)', () => {
    it('should return expired view when timestamp is 3 days old', async () => {
      mockRequest.params.timestamp = (
        Date.now() -
        3 * 24 * 60 * 60 * 1000
      ).toString()
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'verify/index_exp',
        expiredViewPayload
      )
    })

    it('should return expired view when timestamp is exactly 2 days + 1 ms old', async () => {
      mockRequest.params.timestamp = (
        Date.now() -
        (2 * 24 * 60 * 60 * 1000 + 1)
      ).toString()
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'verify/index_exp',
        expiredViewPayload
      )
    })

    it('should return expired view for a negative timestamp', async () => {
      mockRequest.params.timestamp = '-1000000'
      await verifyController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'verify/index_exp',
        expiredViewPayload
      )
    })
  })

  // ─── Valid timestamp — successful API call ──────────────────────────────────

  describe('Valid timestamp - successful API call', () => {
    it('should call axios.post with correct 3 arguments and render success view', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      jest.mocked(axios.post).mockResolvedValue({ data: mockUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: 'test-job-id-123' },
        {
          timeout: HTTP_REQUEST_TIMEOUT_MS,
          headers: { 'Content-Type': 'application/json' }
        }
      )
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should work with a timestamp 1 day old (within 2-day window)', async () => {
      mockRequest.params.timestamp = (
        Date.now() -
        1 * 24 * 60 * 60 * 1000
      ).toString()
      const mockUrl = 'https://download.example.com/data.csv'
      jest.mocked(axios.post).mockResolvedValue({ data: mockUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should treat a timestamp exactly at the 2-day boundary as valid', async () => {
      mockRequest.params.timestamp = (
        Date.now() -
        2 * 24 * 60 * 60 * 1000 +
        100
      ) // Add small buffer to account for test execution time
        .toString()
      const mockUrl = 'https://cdn.example.com/file.zip'
      jest.mocked(axios.post).mockResolvedValue({ data: mockUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should treat a future timestamp as valid', async () => {
      mockRequest.params.timestamp = (
        Date.now() +
        1 * 24 * 60 * 60 * 1000
      ).toString()
      const mockUrl = 'https://example.com/download.csv'
      jest.mocked(axios.post).mockResolvedValue({ data: mockUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should treat a very large timestamp (far future) as valid', async () => {
      mockRequest.params.timestamp = '9999999999999'
      const mockUrl = 'https://example.com/file.csv'
      jest.mocked(axios.post).mockResolvedValue({ data: mockUrl })

      await verifyController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should pass special characters in id to axios', async () => {
      mockRequest.params.id = 'special-!@#$%'
      jest.mocked(axios.post).mockResolvedValue({
        data: 'https://example.com/file.csv'
      })

      await verifyController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: 'special-!@#$%' },
        expect.any(Object)
      )
    })

    it('should pass a very long id to axios', async () => {
      const longId = 'a'.repeat(1000)
      mockRequest.params.id = longId
      jest.mocked(axios.post).mockResolvedValue({
        data: 'https://example.com/file.csv'
      })

      await verifyController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        { jobID: longId },
        expect.any(Object)
      )
    })
  })

  // ─── Valid timestamp — API errors → redirect ────────────────────────────────

  describe('Valid timestamp - API errors redirect to /problem-with-service', () => {
    it('should redirect on a generic network error', async () => {
      jest.mocked(axios.post).mockRejectedValue(new Error('Network error'))

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(mockH.view).not.toHaveBeenCalledWith(
        'verify/index',
        expect.anything()
      )
    })

    it('should redirect on a timeout error (ECONNABORTED)', async () => {
      const timeoutError = new Error(
        `timeout of ${HTTP_REQUEST_TIMEOUT_MS}ms exceeded`
      )
      timeoutError.code = 'ECONNABORTED'
      jest.mocked(axios.post).mockRejectedValue(timeoutError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('should redirect on a 404 response error', async () => {
      const notFoundError = new Error('Request failed with status code 404')
      notFoundError.response = { status: 404, data: 'Not found' }
      jest.mocked(axios.post).mockRejectedValue(notFoundError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('should redirect on a 500 response error', async () => {
      const serverError = new Error('Request failed with status code 500')
      serverError.response = { status: 500, data: 'Internal server error' }
      jest.mocked(axios.post).mockRejectedValue(serverError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── Config integration ─────────────────────────────────────────────────────

  describe('Config integration', () => {
    it('should use config.get("downloadEmailUrl") as the axios endpoint', async () => {
      const customUrl = 'https://custom.api.com/email-download'
      jest.mocked(config.get).mockImplementation((key) => {
        if (key === 'downloadEmailUrl') return customUrl
        return null
      })
      jest.mocked(axios.post).mockResolvedValue({
        data: 'https://example.com/file.csv'
      })

      await verifyController.handler(mockRequest, mockH)

      expect(config.get).toHaveBeenCalledWith('downloadEmailUrl')
      expect(axios.post).toHaveBeenCalledWith(
        customUrl,
        { jobID: 'test-job-id-123' },
        expect.any(Object)
      )
    })
  })

  // ─── Object response format (resultUrl) ─────────────────────────────────────

  describe('Object response format with resultUrl', () => {
    it('should handle object response with resultUrl property', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      jest.mocked(axios.post).mockResolvedValue({
        data: { resultUrl: mockUrl }
      })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should handle object response with resultUrl for timestamp 1 day old', async () => {
      mockRequest.params.timestamp = (
        Date.now() -
        1 * 24 * 60 * 60 * 1000
      ).toString()
      const mockUrl = 'https://download.example.com/data.csv'
      jest.mocked(axios.post).mockResolvedValue({
        data: { resultUrl: mockUrl }
      })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should handle string response format (backward compatibility)', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      jest.mocked(axios.post).mockResolvedValue({
        data: mockUrl
      })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })
  })

  // ─── Development environment (Wreck) ────────────────────────────────────────

  describe('Development environment (isDevelopment = true)', () => {
    beforeEach(() => {
      jest.mocked(config.get).mockImplementation((key) => {
        if (key === 'isDevelopment') return true
        if (key === 'downloadEmailDevUrl')
          return 'https://dev.api.example.com/download'
        if (key === 'osNamesDevApiKey') return 'test-api-key'
        return null
      })
    })

    it('should use Wreck.post for development environment', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      jest.mocked(Wreck.post).mockResolvedValue({
        payload: mockUrl
      })

      await verifyController.handler(mockRequest, mockH)

      expect(Wreck.post).toHaveBeenCalledWith(
        'https://dev.api.example.com/download',
        {
          payload: JSON.stringify({ jobID: 'test-job-id-123' }),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          },
          json: true
        }
      )
      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should handle object response with resultUrl in development', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/file.csv'
      jest.mocked(Wreck.post).mockResolvedValue({
        payload: { resultUrl: mockUrl }
      })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: mockUrl
      })
    })

    it('should redirect to problem page on Wreck error in development', async () => {
      jest.mocked(Wreck.post).mockRejectedValue(new Error('Network error'))

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('should redirect to problem page when payload is empty in development', async () => {
      jest.mocked(Wreck.post).mockResolvedValue({
        payload: null
      })

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── S3 presigned URL validation ────────────────────────────────────────────

  describe('S3 URL validation', () => {
    it('treats a maxContentLength error as a valid URL and renders the success view', async () => {
      const maxLengthError = new Error('maxContentLength exceeded')
      maxLengthError.code = 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED'
      jest.mocked(axios.get).mockRejectedValue(maxLengthError)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl: 'https://example.com/download/file.csv'
      })
    })

    it('redirects to problem page when S3 validation fails with a real error', async () => {
      const s3Error = new Error('Bad Gateway')
      s3Error.response = { status: 502 }
      jest.mocked(axios.get).mockRejectedValue(s3Error)

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('defaults the status code when the failing S3 error has no response', async () => {
      jest.mocked(axios.get).mockRejectedValue(new Error('connection reset'))

      await verifyController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })
})
