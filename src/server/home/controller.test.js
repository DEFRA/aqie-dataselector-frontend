import { homeController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock the data import
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
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
    // Reset all mocks
    jest.clearAllMocks()

    // Mock request object with yar session
    mockRequest = {
      yar: {
        set: jest.fn()
      }
    }

    // Mock h object
    mockH = {
      view: jest.fn().mockReturnValue('view-response')
    }
  })

  describe('handler', () => {
    it('should return home view with correct data', () => {
      const result = homeController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Test Home Page',
        heading: 'Test Heading',
        text: ['Test text 1', 'Test text 2'],
        buttontxt: 'Test Button',
        subheading: 'Test Subheading'
      })
      expect(result).toBe('view-response')
    })

    it('should clear all session data on handler call', () => {
      homeController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
    })

    it('should call yar.set exactly 8 times', () => {
      homeController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledTimes(8)
    })

    it('should set specific year values', () => {
      homeController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
    })

    it('should handle missing home data gracefully', () => {
      // Mock englishNew without home property
      const originalEnglishNew = englishNew.home
      delete englishNew.home

      expect(() => {
        homeController.handler(mockRequest, mockH)
      }).toThrow()

      // Restore original data
      englishNew.home = originalEnglishNew
    })

    it('should use englishNew.home data correctly', () => {
      homeController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'home/index',
        expect.objectContaining({
          pageTitle: englishNew.home.pageTitle,
          heading: englishNew.home.heading,
          text: englishNew.home.texts,
          buttontxt: englishNew.home.buttonText,
          subheading: englishNew.home.subheading
        })
      )
    })

    it('should reset search-related session values to empty strings', () => {
      homeController.handler(mockRequest, mockH)

      const emptyStringCalls = [
        ['searchLocation', ''],
        ['osnameapiresult', ''],
        ['selectedLocation', ''],
        ['nooflocation', '']
      ]

      emptyStringCalls.forEach(([key, value]) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
      })
    })

    it('should reset query-related session values to null', () => {
      homeController.handler(mockRequest, mockH)

      const nullCalls = [
        ['searchQuery', null],
        ['fullSearchQuery', null]
      ]

      nullCalls.forEach(([key, value]) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
      })
    })

    it('should return the view response', () => {
      const result = homeController.handler(mockRequest, mockH)

      expect(result).toBe('view-response')
    })
  })
})
