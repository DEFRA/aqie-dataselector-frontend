import { yearController } from './controller.js'

// Mock englishNew import to match controller usage
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Year Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))
import { englishNew } from '~/src/server/data/en/content_aurn.js'

describe('yearController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      params: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('year-aurn-view-response')
    }
  })

  it('should set all session values and render the view with correct data', () => {
    const result = yearController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

    expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts
    })
    expect(result).toBe('year-aurn-view-response')
  })

  it('should not set selectedpollutant if params.pollutants is undefined', () => {
    yearController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })
})
