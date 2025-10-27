import { downloadAurnController } from './controller.js'
import axios from 'axios'

jest.mock('axios')

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
    // Default session values
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedpollutant') return 'NO2'
      if (key === 'selectedyear') return '2022'
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

  // it('should handle errors from Invokedownload gracefully', async () => {
  //   axios.post.mockRejectedValue(new Error('Download failed'))
  //   const result = await downloadAurnController.handler(mockRequest, mockH)
  //   // Since error is caught and nothing is returned, result should be undefined
  //   expect(result).toBeUndefined()
  //   // Should not call yar.set or h.response
  //   expect(mockRequest.yar.set).not.toHaveBeenCalled()
  //   expect(mockH.response).not.toHaveBeenCalled()
  // })

  it('should use correct pollutant and year from session', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedpollutant') return 'PM10'
      if (key === 'selectedyear') return '2023'
      return undefined
    })
    axios.post.mockResolvedValue({ data: { success: true } })

    await downloadAurnController.handler(mockRequest, mockH)

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ pollutantName: 'PM10', Year: '2023' })
    )
  })
})
