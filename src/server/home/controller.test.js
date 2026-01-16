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

    // Get current year for comparison
    const currentYear = new Date().getFullYear().toString()

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )
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

  it('should set session variables in correct order', () => {
    const currentYear = new Date().getFullYear().toString()

    homeController.handler(mockRequest, mockH)

    // Verify all 11 session variables are set correctly
    expect(mockRequest.yar.set).toHaveBeenCalledTimes(11)

    // Verify the order of calls
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(1, 'searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      2,
      'fullSearchQuery',
      null
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(3, 'searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      4,
      'osnameapiresult',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      5,
      'selectedLocation',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(6, 'nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      7,
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      8,
      'selectedYear',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      9,
      'selectedpollutant',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(10, 'selectedyear', '')
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      11,
      'selectedlocation',
      ''
    )
  })

  it('should use current year dynamically', () => {
    // Mock Date to test a specific year
    const originalDate = Date
    const mockDate = jest.fn(() => ({
      getFullYear: () => 2030
    }))
    global.Date = mockDate
    global.Date.getFullYear = jest.fn(() => 2030)

    homeController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2030')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2030')

    // Restore original Date
    global.Date = originalDate
  })

  it('should render home/index view with all required properties', () => {
    homeController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('home/index', {
      pageTitle: expect.any(String),
      heading: expect.any(String),
      text: expect.any(Object), // texts is an array
      buttontxt: expect.any(String),
      subheading: expect.any(String)
    })
  })

  it('should use english.home content structure', () => {
    homeController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('home/index', {
      pageTitle: 'Test Home Page',
      heading: 'Test Heading',
      text: ['Test text 1', 'Test text 2'],
      buttontxt: 'Test Button',
      subheading: 'Test Subheading'
    })
  })

  it('should clear search-related session variables', () => {
    homeController.handler(mockRequest, mockH)

    // Verify search-related variables are cleared
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
  })

  it('should clear location-related session variables', () => {
    homeController.handler(mockRequest, mockH)

    // Verify location-related variables are cleared
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', '')
  })

  it('should clear pollutant-related session variables', () => {
    homeController.handler(mockRequest, mockH)

    // Verify pollutant-related variables are cleared
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', '')
  })

  it('should clear year-related session variables and set current year', () => {
    const currentYear = new Date().getFullYear().toString()

    homeController.handler(mockRequest, mockH)

    // Verify year variables - some cleared, some set to current year
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '') // This one is cleared
  })

  it('should return the view response', () => {
    const result = homeController.handler(mockRequest, mockH)

    expect(result).toBe('home-view-response')
  })

  describe('Error handling', () => {
    it('should handle missing yar object', () => {
      mockRequest.yar = null

      expect(() => {
        homeController.handler(mockRequest, mockH)
      }).toThrow()
    })

    it('should handle missing h.view function', () => {
      mockH.view = null

      expect(() => {
        homeController.handler(mockRequest, mockH)
      }).toThrow()
    })

    it('should handle missing english.home object', () => {
      // This would be caught at import time, but we can test gracefully
      const originalEnglish = english.home
      delete english.home

      expect(() => {
        homeController.handler(mockRequest, mockH)
      }).toThrow()

      // Restore for other tests
      english.home = originalEnglish
    })
  })

  describe('Session management', () => {
    it('should reset all session variables to initial state', () => {
      const currentYear = new Date().getFullYear().toString()

      homeController.handler(mockRequest, mockH)

      // Verify the complete session reset pattern
      const expectedCalls = [
        ['searchQuery', null],
        ['fullSearchQuery', null],
        ['searchLocation', ''],
        ['osnameapiresult', ''],
        ['selectedLocation', ''],
        ['nooflocation', ''],
        ['yearselected', currentYear],
        ['selectedYear', currentYear],
        ['selectedpollutant', ''],
        ['selectedyear', ''],
        ['selectedlocation', '']
      ]

      expectedCalls.forEach(([key, value]) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
      })
    })

    // it('should handle session variables consistently', () => {
    //   homeController.handler(mockRequest, mockH)

    //   // Verify that all session operations complete before view rendering
    //   const lastSetCall = mockRequest.yar.set.mock.calls.length
    //   expect(lastSetCall).toBe(11)
    //   expect(mockH.view).toHaveBeenCalledAfter(mockRequest.yar.set)
    // })
  })

  describe('Content mapping', () => {
    it('should map all content properties correctly', () => {
      homeController.handler(mockRequest, mockH)

      const viewCall = mockH.view.mock.calls[0][1]

      expect(viewCall).toHaveProperty('pageTitle', 'Test Home Page')
      expect(viewCall).toHaveProperty('heading', 'Test Heading')
      expect(viewCall).toHaveProperty('text', ['Test text 1', 'Test text 2'])
      expect(viewCall).toHaveProperty('buttontxt', 'Test Button')
      expect(viewCall).toHaveProperty('subheading', 'Test Subheading')
    })

    it('should use correct template path', () => {
      homeController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('home/index', expect.any(Object))
    })
  })
})
