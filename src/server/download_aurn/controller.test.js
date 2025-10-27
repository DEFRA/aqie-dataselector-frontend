import { downloadAurnController } from './controller.js'
// import * as controllerModule from './controller.js'
import axios from 'axios'

jest.mock('axios', () => ({
  post: jest.fn()
}))

describe('downloadAurnController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = {
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
    // Default selectedpollutant
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedpollutant') return 'NO2'
      return undefined
    })
  })

  it('should call Invokedownload with correct params and set result in session', async () => {
    const mockData = { success: true, data: [1, 2, 3] }
    axios.post.mockResolvedValue({ data: mockData })

    const result = await downloadAurnController.handler(mockRequest, mockH)

    expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
      pollutantName: 'NO2',
      dataSource: 'AURN',
      Region: 'England',
      Year: '2022',
      dataselectorfiltertype: 'dataSelectorHourly'
    })
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'downloadaurnresult',
      mockData
    )
    expect(mockH.response).toHaveBeenCalledWith(mockData)
    expect(mockH.type).toHaveBeenCalledWith('application/json')
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(result).toBe(mockH)
  })

  it('should use correct pollutant from session', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedpollutant') return 'PM10'
      return undefined
    })
    axios.post.mockResolvedValue({ data: { success: true } })

    await downloadAurnController.handler(mockRequest, mockH)

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ pollutantName: 'PM10' })
    )
  })
})
