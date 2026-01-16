import { datasourceController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock the content module
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Data Source Page',
      heading: 'Test Data Source Heading',
      texts: 'Test Data Source Texts'
    }
  }
}))

describe('datasourceController', () => {
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
      view: jest.fn().mockReturnValue('datasource-view-response')
    }
  })

  it('should set session values and render the view with correct data', () => {
    const result = datasourceController.handler(mockRequest, mockH)

    // Get current year for comparison
    const currentYear = new Date().getFullYear().toString()

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    // Updated to expect current year dynamically
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )

    expect(mockH.view).toHaveBeenCalledWith('datasource/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('datasource-view-response')
  })

  it('should set all session variables to expected values', () => {
    datasourceController.handler(mockRequest, mockH)

    const currentYear = new Date().getFullYear().toString()

    // Verify all session variables are set correctly
    expect(mockRequest.yar.set).toHaveBeenCalledTimes(8)
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

  it('should not set selectedpollutant since that code is commented out', () => {
    datasourceController.handler(mockRequest, mockH)

    // The selectedpollutant code is commented out, so it should not be called
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should work with params.pollutants defined (but not use it due to commented code)', () => {
    mockRequest.params.pollutants = 'NO2,PM10,O3'

    datasourceController.handler(mockRequest, mockH)

    // Even with pollutants in params, the code is commented out so nothing should happen
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      'NO2,PM10,O3'
    )
  })

  it('should work with undefined params.pollutants', () => {
    mockRequest.params.pollutants = undefined

    datasourceController.handler(mockRequest, mockH)

    // Should not set selectedpollutant regardless
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should set correct backUrl and render properties', () => {
    datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({
        pageTitle: 'Test Data Source Page',
        heading: 'Test Data Source Heading',
        texts: 'Test Data Source Texts',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
  })

  it('should render view with all required properties', () => {
    const result = datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('datasource/index', {
      pageTitle: expect.any(String),
      heading: expect.any(String),
      texts: expect.any(String),
      displayBacklink: true,
      hrefq: '/customdataset'
    })

    expect(result).toBe('datasource-view-response')
  })

  it('should handle missing params object', () => {
    delete mockRequest.params

    const result = datasourceController.handler(mockRequest, mockH)

    // Should still work since params are not actively used (code is commented)
    expect(mockH.view).toHaveBeenCalled()
    expect(result).toBe('datasource-view-response')
  })

  it('should handle null params object', () => {
    mockRequest.params = null

    const result = datasourceController.handler(mockRequest, mockH)

    // Should still work since params are not actively used
    expect(mockH.view).toHaveBeenCalled()
    expect(result).toBe('datasource-view-response')
  })

  it('should use consistent backUrl throughout', () => {
    datasourceController.handler(mockRequest, mockH)

    // Verify the backUrl is correctly set to '/customdataset'
    expect(mockH.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({
        hrefq: '/customdataset'
      })
    )
  })

  describe('Year handling', () => {
    it('should use current year for both yearselected and selectedYear', () => {
      const currentYear = new Date().getFullYear().toString()

      datasourceController.handler(mockRequest, mockH)

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
      const mockDate = new Date('2030-01-01')
      global.Date = jest.fn(() => mockDate)
      global.Date.getFullYear = jest.fn(() => 2030)

      // Reset the constructor
      Object.setPrototypeOf(global.Date, originalDate)
      global.Date.prototype = originalDate.prototype

      datasourceController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2030')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2030')

      // Restore original Date
      global.Date = originalDate
    })
  })

  describe('Session management', () => {
    it('should reset search-related session variables', () => {
      datasourceController.handler(mockRequest, mockH)

      // Verify search-related variables are reset
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    })

    it('should reset location-related session variables', () => {
      datasourceController.handler(mockRequest, mockH)

      // Verify location-related variables are reset
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    })

    it('should set year-related session variables to current year', () => {
      const currentYear = new Date().getFullYear().toString()

      datasourceController.handler(mockRequest, mockH)

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
  })

  describe('Error handling', () => {
    it('should handle missing yar object', () => {
      mockRequest.yar = null

      expect(() => {
        datasourceController.handler(mockRequest, mockH)
      }).toThrow()
    })

    it('should handle missing h.view function', () => {
      mockH.view = null

      expect(() => {
        datasourceController.handler(mockRequest, mockH)
      }).toThrow()
    })
  })
})
