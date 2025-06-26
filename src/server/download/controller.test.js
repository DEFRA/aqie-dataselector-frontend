import { downloadcontroller } from '~/src/server/download/controller.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
jest.mock('axios')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

describe('downloadcontroller.handler', () => {
  const mockStationDetails = {
    region: 'London',
    siteType: 'Urban',
    name: 'Station A',
    localSiteID: '123',
    location: {
      coordinates: [51.5074, -0.1278]
    }
  }

  const mockRequest = {
    yar: {
      get: jest.fn(),
      set: jest.fn()
    },
    params: {
      poll: 'NO2',
      freq: 'hourly'
    }
  }

  const mockResponseToolkit = {
    response: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    code: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        stationdetails: mockStationDetails,
        selectedYear: '2024',
        latesttime: '2024-12-31T23:59:59Z'
      }
      return values[key]
    })
    config.get.mockReturnValue('https://mock-download-url.com')
  })

  it('should return download result with status 200', async () => {
    const mockDownloadData = { success: true, data: 'mocked data' }
    axios.post.mockResolvedValue({ data: mockDownloadData })

    await downloadcontroller.handler(mockRequest, mockResponseToolkit)

    expect(axios.post).toHaveBeenCalledWith(
      'https://mock-download-url.com',
      expect.objectContaining({
        region: 'London',
        siteType: 'Urban',
        sitename: 'Station A',
        siteId: '123',
        latitude: '51.5074',
        longitude: '-0.1278',
        year: '2024',
        downloadpollutant: 'NO2',
        downloadpollutanttype: 'hourly',
        stationreaddate: '2024-12-31T23:59:59Z'
      })
    )

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'downloadresult',
      mockDownloadData
    )
    expect(mockResponseToolkit.response).toHaveBeenCalledWith(mockDownloadData)
    expect(mockResponseToolkit.type).toHaveBeenCalledWith('application/json')
    expect(mockResponseToolkit.code).toHaveBeenCalledWith(200)
  })

  it('should handle axios error gracefully', async () => {
    const mockError = new Error('Download failed')
    axios.post.mockRejectedValue(mockError)

    const result = await downloadcontroller.handler(
      mockRequest,
      mockResponseToolkit
    )

    // Since the catch block in your controller doesn't return anything,
    // the result will be undefined. You might want to improve error handling.
    expect(result).toBeUndefined()
  })
})
