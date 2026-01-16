import { homeControllerOld } from '~/src/server/home_old/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('homeControllerOld.handler', () => {
  const mockRequest = {
    yar: {
      set: jest.fn()
    }
  }

  const mockResponseToolkit = {
    view: jest.fn().mockReturnValue('home-view-response')
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should set session values and render the home view with correct content', () => {
    const result = homeControllerOld.handler(mockRequest, mockResponseToolkit)

    // Get current year for comparison
    const currentYear = new Date().getFullYear().toString()

    // Check session values - both year fields should be set to current year
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

    // Check view rendering
    expect(mockResponseToolkit.view).toHaveBeenCalledWith('home/index', {
      pageTitle: english.home.pageTitle,
      heading: english.home.heading,
      text: english.home.texts,
      links: english.home.links,
      buttontxt: english.home.buttonText,
      subheading: english.home.subheading
    })

    expect(result).toBe('home-view-response')
  })

  it('should set all session variables in correct order', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    const currentYear = new Date().getFullYear().toString()

    // Verify all 8 session variables are set correctly
    expect(mockRequest.yar.set).toHaveBeenCalledTimes(8)

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
  })

  it('should use current year dynamically for both year variables', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    const currentYear = new Date().getFullYear().toString()

    // Both year variables should be set to the same current year
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )
  })

  it('should handle year changes correctly if run in different years', () => {
    // Mock Date to test future year
    const originalDate = Date
    const mockDate = jest.fn(() => ({
      getFullYear: () => 2030
    }))
    global.Date = mockDate
    global.Date.getFullYear = jest.fn(() => 2030)

    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2030')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2030')

    // Restore original Date
    global.Date = originalDate
  })

  it('should render home/index view with all required properties', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    expect(mockResponseToolkit.view).toHaveBeenCalledWith('home/index', {
      pageTitle: expect.any(String),
      heading: expect.any(String),
      text: expect.any(Object), // texts is an array
      links: expect.any(Object), // links is an object
      buttontxt: expect.any(String),
      subheading: expect.any(String)
    })
  })

  it('should use english.home content structure', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    expect(mockResponseToolkit.view).toHaveBeenCalledWith('home/index', {
      pageTitle: english.home.pageTitle,
      heading: english.home.heading,
      text: english.home.texts,
      links: english.home.links,
      buttontxt: english.home.buttonText,
      subheading: english.home.subheading
    })
  })

  it('should clear search-related session variables', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    // Verify search-related variables are cleared
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
  })

  it('should clear location-related session variables', () => {
    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    // Verify location-related variables are cleared
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
  })

  it('should set year-related session variables to current year', () => {
    const currentYear = new Date().getFullYear().toString()

    homeControllerOld.handler(mockRequest, mockResponseToolkit)

    // Verify year variables are set to current year
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )
  })

  it('should return the view response', () => {
    const result = homeControllerOld.handler(mockRequest, mockResponseToolkit)

    expect(result).toBe('home-view-response')
  })

  describe('Year consistency', () => {
    it('should set both year variables to identical values', () => {
      homeControllerOld.handler(mockRequest, mockResponseToolkit)

      const yearSelectedCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'yearselected'
      )
      const selectedYearCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'selectedYear'
      )

      expect(yearSelectedCall[1]).toBe(selectedYearCall[1])
    })

    it('should use string representation of year', () => {
      homeControllerOld.handler(mockRequest, mockResponseToolkit)

      const yearSelectedCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'yearselected'
      )

      expect(typeof yearSelectedCall[1]).toBe('string')
      expect(yearSelectedCall[1]).toMatch(/^\d{4}$/) // Should be a 4-digit year string
    })
  })

  describe('Error handling', () => {
    it('should handle missing yar object', () => {
      const requestWithoutYar = {}

      expect(() => {
        homeControllerOld.handler(requestWithoutYar, mockResponseToolkit)
      }).toThrow()
    })

    it('should handle missing h.view function', () => {
      const hWithoutView = {}

      expect(() => {
        homeControllerOld.handler(mockRequest, hWithoutView)
      }).toThrow()
    })

    it('should handle missing request object', () => {
      expect(() => {
        homeControllerOld.handler(null, mockResponseToolkit)
      }).toThrow()
    })

    it('should handle missing h object', () => {
      expect(() => {
        homeControllerOld.handler(mockRequest, null)
      }).toThrow()
    })
  })

  describe('Content structure verification', () => {
    it('should include links property in view data', () => {
      homeControllerOld.handler(mockRequest, mockResponseToolkit)

      const viewCall = mockResponseToolkit.view.mock.calls[0][1]

      expect(viewCall).toHaveProperty('pageTitle')
      expect(viewCall).toHaveProperty('heading')
      expect(viewCall).toHaveProperty('text')
      expect(viewCall).toHaveProperty('links') // This is unique to home_old controller
      expect(viewCall).toHaveProperty('buttontxt')
      expect(viewCall).toHaveProperty('subheading')
    })

    it('should use correct template path', () => {
      homeControllerOld.handler(mockRequest, mockResponseToolkit)

      expect(mockResponseToolkit.view).toHaveBeenCalledWith(
        'home/index',
        expect.any(Object)
      )
    })
  })
})
