import { homeController } from './controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

// Mock english import to match controller usage
jest.mock('~/src/server/data/en/homecontent.js', () => ({
  english: {
    home: {
      pageTitle: 'Test Home Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2'],
      buttonText: 'Test Button',
      subheading: 'Test Subheading'
    }
  }
}))

describe('homeController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      yar: {
        set: jest.fn()
      }
    }
    mockH = {
      view: jest.fn().mockReturnValue('home-view-response')
    }
  })

  it('should set all session values and render the view with correct data', () => {
    const result = homeController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', '')

    expect(mockH.view).toHaveBeenCalledWith('home/index', {
      pageTitle: english.home.pageTitle,
      heading: english.home.heading,
      text: english.home.texts,
      buttontxt: english.home.buttonText,
      subheading: english.home.subheading
    })
    expect(result).toBe('home-view-response')
  })
})
