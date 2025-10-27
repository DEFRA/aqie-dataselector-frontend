import { downloadDataselectorController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock the data import
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    customdataset: {
      pageTitle: 'Test customdataset Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2'],
      buttonText: 'Test Button',
      subheading: 'Test Subheading'
    },
    custom: {
      pageTitle: 'Test Download Data Selector Page',
      heading: 'Test Download Heading',
      texts: ['Test download text 1', 'Test download text 2']
    }
  }
}))

describe('downloadDataselectorController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock request object with yar session
    mockRequest = {
      yar: {
        get: jest.fn()
      }
    }

    // Mock h object
    mockH = {
      view: jest.fn().mockReturnValue('view-response')
    }
  })

  describe('handler', () => {
    it('should render the view with correct data from session and englishNew', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'downloadaurnresult') return { result: 'data' }
        if (key === 'nooflocation') return 5
        return undefined
      })

      const result = downloadDataselectorController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: { result: 'data' },
        stationcount: 5
      })
      expect(result).toBe('view-response')
    })

    it('should handle undefined session values gracefully', () => {
      mockRequest.yar.get.mockReturnValue(undefined)

      const result = downloadDataselectorController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: undefined,
        stationcount: undefined
      })
      expect(result).toBe('view-response')
    })
  })
})
