import { customdatasetController } from './controller.js'
import axios from 'axios'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock axios
jest.mock('axios')

// Mock englishNew import to match controller usage
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Customdataset Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

describe('customdatasetController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = {
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      params: {},
      payload: {},
      path: '/customdataset'
    }
    mockH = {
      view: jest.fn().mockReturnValue('view-response')
    }
    // Default yar.get returns undefined
    // mockRequest.yar.get.mockImplementation((key) => undefined)
  })

  it('should set session values and render view with defaults', async () => {
    const result = await customdatasetController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      new Date().getFullYear().toString()
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      new Date().getFullYear().toString()
    )
    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      selectedpollutant: undefined,
      selectedyear: undefined,
      selectedlocation: undefined,
      stationcount: undefined
    })
    expect(result).toBe('view-response')
  })

  it('should set selectedpollutant if present in params', async () => {
    mockRequest.params.pollutants = 'NO2'
    await customdatasetController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', 'NO2')
  })

  it('should set selectedyear if path includes /year', async () => {
    mockRequest.path = '/customdataset/year'
    mockRequest.params.year = '2023'
    await customdatasetController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '2023')
  })

  it('should set selectedlocation if path includes /location and payload.country is string', async () => {
    mockRequest.path = '/customdataset/location'
    mockRequest.payload.country = 'England'
    await customdatasetController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
      'England'
    ])
  })

  it('should set selectedlocation if path includes /location and payload.country is array', async () => {
    mockRequest.path = '/customdataset/location'
    mockRequest.payload.country = ['England', 'Wales']
    await customdatasetController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
      'England',
      'Wales'
    ])
  })

  it('should call Invokestationcount and set nooflocation if all session values are present', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedlocation') return ['England']
      if (key === 'selectedyear') return '2022'
      if (key === 'selectedpollutant') return 'NO2'
      return undefined
    })
    axios.post.mockResolvedValue({ data: 42 })
    await customdatasetController.handler(mockRequest, mockH)
    expect(axios.post).toHaveBeenCalled()
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', 42)
  })

  it('should set all expected values in view context', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedpollutant: 'NO2',
        selectedyear: '2022',
        selectedlocation: ['England'],
        nooflocation: 5
      }
      return values[key]
    })
    await customdatasetController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      selectedpollutant: 'NO2',
      selectedyear: '2022',
      selectedlocation: ['England'],
      stationcount: 5
    })
  })
})
