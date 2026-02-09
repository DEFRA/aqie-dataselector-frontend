import { downloadAurnstatusController } from './controller.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
jest.mock('axios')
jest.mock('~/src/config/config.js')

describe('downloadAurnstatusController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock config.get to return the polling URL
    config.get.mockReturnValue(
      'https://api.example.com/AtomDataSelectionJobStatus/'
    )

    // Mock request with yar session
    mockRequest = {
      params: {},
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    // Mock Hapi response toolkit
    mockH = {
      response: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    // Mock console.log used inside controller
    //  global.console.log = jest.fn()
  })

  describe('handler', () => {
    it('should return 400 error when jobID is missing', async () => {
      mockRequest.params.jobID = undefined

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        message: 'Job ID is required'
      })
      expect(mockH.code).toHaveBeenCalledWith(400)
    })

    it('should return 400 error when jobID is null', async () => {
      mockRequest.params.jobID = null

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        message: 'Job ID is required'
      })
      expect(mockH.code).toHaveBeenCalledWith(400)
    })

    it('should return 400 error when jobID is empty string', async () => {
      mockRequest.params.jobID = ''

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        message: 'Job ID is required'
      })
      expect(mockH.code).toHaveBeenCalledWith(400)
    })

    it('should check status and return completed status with resultUrl', async () => {
      const jobID = 'test-job-123'
      const resultUrl = 'https://s3.example.com/file.csv'

      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue({ stationcount: 5 })

      axios.post.mockResolvedValue({
        data: {
          status: 'Completed',
          resultUrl
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/AtomDataSelectionJobStatus/',
        { jobID }
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'downloadaurnresult',
        resultUrl
      )
      expect(mockRequest.yar.get).toHaveBeenCalledWith('viewDatanojs')
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'Completed',
        resultUrl,
        viewData: { stationcount: 5 }
      })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should check status and return in-progress status without saving to session', async () => {
      const jobID = 'test-job-456'

      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue(null)

      axios.post.mockResolvedValue({
        data: {
          status: 'InProgress',
          resultUrl: null
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/AtomDataSelectionJobStatus/',
        { jobID }
      )
      expect(mockRequest.yar.set).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'InProgress',
        resultUrl: null,
        viewData: null
      })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should return pending status without resultUrl', async () => {
      const jobID = 'test-job-789'

      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue({ stationcount: 10 })

      axios.post.mockResolvedValue({
        data: {
          status: 'Pending'
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'Pending',
        resultUrl: null,
        viewData: { stationcount: 10 }
      })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should handle API response error and return appropriate status code', async () => {
      const jobID = 'test-job-error'
      mockRequest.params.jobID = jobID

      const apiError = new Error('API Error')
      apiError.response = { status: 403 }
      axios.post.mockRejectedValue(apiError)

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        statusCode: 403,
        message: 'Status check failed'
      })
      expect(mockH.code).toHaveBeenCalledWith(403)
    })

    it('should handle API request error and return 500', async () => {
      const jobID = 'test-job-request-error'
      mockRequest.params.jobID = jobID

      const apiError = new Error('Network Error')
      apiError.request = {}
      axios.post.mockRejectedValue(apiError)

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        statusCode: 500,
        message: 'Status check failed'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should handle generic error and return 500', async () => {
      const jobID = 'test-job-generic-error'
      mockRequest.params.jobID = jobID

      const genericError = new Error('Something went wrong')
      axios.post.mockRejectedValue(genericError)

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        statusCode: 500,
        message: 'Status check failed'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should handle unexpected exception in handler and return 500', async () => {
      const jobID = 'test-job-exception'
      mockRequest.params.jobID = jobID

      // Simulate session failure after API call
      mockRequest.yar.get.mockImplementation(() => {
        throw new Error('Session error')
      })

      axios.post.mockResolvedValue({
        data: {
          status: 'Completed',
          resultUrl: 'https://s3.example.com/file.csv'
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: true,
        message: 'An error occurred'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should not save to session when status is Completed but resultUrl is missing', async () => {
      const jobID = 'test-job-no-url'
      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue(null)

      axios.post.mockResolvedValue({
        data: {
          status: 'Completed',
          resultUrl: null
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'Completed',
        resultUrl: null,
        viewData: null
      })
      expect(mockH.type).toHaveBeenCalledWith('application/json')
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should not save to session when status is Completed but resultUrl is empty string', async () => {
      const jobID = 'test-job-empty-url'
      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue(null)

      axios.post.mockResolvedValue({
        data: {
          status: 'Completed',
          resultUrl: ''
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'Completed',
        resultUrl: null,
        viewData: null
      })
    })

    // it('should log jobID/params/response to console as expected', async () => {
    //   const jobID = 'test-job-logging'
    //   const resultUrl = 'https://s3.example.com/data.csv'

    //   mockRequest.params.jobID = jobID
    //   mockRequest.yar.get.mockReturnValue(null)

    //   axios.post.mockResolvedValue({
    //     data: {
    //       status: 'Completed',
    //       resultUrl
    //     }
    //   })

    //   await downloadAurnstatusController.handler(mockRequest, mockH)

    //   expect(console.log).toHaveBeenCalledWith('downloadstatusapiparams in handler', { jobID })
    //   expect(console.log).toHaveBeenCalledWith('downloadstatusapiparams', { jobID })
    //   expect(console.log).toHaveBeenCalledWith('statusResponse', {
    //     status: 'Completed',
    //     resultUrl
    //   })
    // })

    it('should use config.get to retrieve polling URL', async () => {
      const jobID = 'test-job-config'
      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue(null)

      axios.post.mockResolvedValue({
        data: {
          status: 'Processing'
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(config.get).toHaveBeenCalledWith('Polling_URL')
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/AtomDataSelectionJobStatus/',
        { jobID }
      )
    })

    it('should return viewData from session when available', async () => {
      const jobID = 'test-job-viewdata'
      const viewData = {
        stationcount: 15,
        yearrange: 'Multiple',
        finalyear: ['2023', '2024']
      }

      mockRequest.params.jobID = jobID
      mockRequest.yar.get.mockReturnValue(viewData)

      axios.post.mockResolvedValue({
        data: {
          status: 'Processing'
        }
      })

      await downloadAurnstatusController.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('viewDatanojs')
      expect(mockH.response).toHaveBeenCalledWith({
        status: 'Processing',
        resultUrl: null,
        viewData
      })
    })
  })
})
