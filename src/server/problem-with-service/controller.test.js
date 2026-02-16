import { problemWithServiceController } from './controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('problemWithServiceController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      query: {}
    }

    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }
  })

  describe('handler', () => {
    it('should render error page with 404 status code and message', () => {
      mockRequest.query = { statusCode: '404' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Page not found',
        statusCode: 404,
        message: 'Page not found',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    it('should render error page with 403 status code and message', () => {
      mockRequest.query = { statusCode: '403' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Forbidden',
        statusCode: 403,
        message: 'Forbidden',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(403)
    })

    it('should render error page with 401 status code and message', () => {
      mockRequest.query = { statusCode: '401' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Unauthorized',
        statusCode: 401,
        message: 'Unauthorized',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(401)
    })

    it('should render error page with 400 status code and message', () => {
      mockRequest.query = { statusCode: '400' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Bad Request',
        statusCode: 400,
        message: 'Bad Request',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(400)
    })

    it('should render error page with 500 status code and message', () => {
      mockRequest.query = { statusCode: '500' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when no status code is provided', () => {
      mockRequest.query = {}

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when status code is null', () => {
      mockRequest.query = { statusCode: null }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when status code is undefined', () => {
      mockRequest.query = { statusCode: undefined }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when status code is invalid (non-numeric)', () => {
      mockRequest.query = { statusCode: 'invalid' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when status code is below valid range', () => {
      mockRequest.query = { statusCode: '99' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should default to 500 when status code is above valid range', () => {
      mockRequest.query = { statusCode: '600' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 500,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should handle unrecognized valid status codes with default message', () => {
      mockRequest.query = { statusCode: '502' }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Sorry, there is a problem with the service',
        statusCode: 502,
        message: 'Sorry, there is a problem with the service',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(502)
    })

    it('should handle numeric status code as number', () => {
      mockRequest.query = { statusCode: 404 }

      problemWithServiceController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Page not found',
        statusCode: 404,
        message: 'Page not found',
        content: english.errorpages
      })
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    it('should return chainable response object', () => {
      mockRequest.query = { statusCode: '404' }

      const result = problemWithServiceController.handler(mockRequest, mockH)

      expect(result).toBe(mockH)
    })
  })
})
