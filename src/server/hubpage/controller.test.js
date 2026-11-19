import { hubController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'

// Mock the content module
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    hub: {
      pageTitle: 'Test Hub Page',
      texts: 'Test hub page texts'
    }
  }
}))

describe('hubController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      yar: {
        set: jest.fn()
      }
    }
    mockH = {
      view: jest.fn().mockReturnValue('hub-view-response')
    }
  })

  it('should set all session variables and render the view with correct data', () => {
    const result = hubController.handler(mockRequest, mockH)
    const currentYear = new Date().getFullYear().toString()
    // List of all expected session variables and their values
    const expectedSessionVars = [
      ['searchQuery', null],
      ['fullSearchQuery', null],
      ['searchLocation', ''],
      ['osnameapiresult', ''],
      ['selectedLocation', ''],
      ['nooflocation', ''],
      ['nooflocation', ''],
      ['yearselected', currentYear],
      ['selectedYear', currentYear],
      ['selectedpollutant', ''],
      ['selectedyear', ''],
      ['selectedlocation', ''],
      ['nooflocation', ''],
      ['selectedPollutants', null],
      ['selectedPollutantMode', ''],
      ['selectedPollutantGroup', ''],
      ['formattedPollutants', ''],
      ['yearFormErrors', null],
      ['yearFormData', null],
      ['TimeSelectionMode', ''],
      ['yearany', ''],
      ['startYear', ''],
      ['endYear', ''],
      ['startyear_ytd', ''],
      ['selectedTimePeriod', null],
      ['yearrange', ''],
      ['finalyear', ''],
      ['finalyear1', ''],
      ['Region', ''],
      ['selectedLAIDs', ''],
      ['Location', '']
    ]
    // Check each expected session variable was set
    expectedSessionVars.forEach(([key, value]) => {
      expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
    })
    expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
      pageTitle: englishNew.hub.pageTitle,
      texts: englishNew.hub.texts,
      mapUrl: null
    })
    expect(result).toBe('hub-view-response')
  })

  it('should use current year dynamically for both year variables', () => {
    hubController.handler(mockRequest, mockH)

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

    hubController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2030')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2030')

    // Restore original Date
    global.Date = originalDate
  })

  it('should render hubpage/index view with correct content', () => {
    hubController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
      pageTitle: 'Test Hub Page',
      texts: 'Test hub page texts',
      mapUrl: null
    })
  })

  it('should render view with all required properties', () => {
    hubController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
      pageTitle: expect.any(String),
      texts: expect.any(String),
      mapUrl: null
    })
  })

  it('should return the view response', () => {
    const result = hubController.handler(mockRequest, mockH)

    expect(result).toBe('hub-view-response')
  })

  describe('Map link', () => {
    beforeEach(() => {
      config.set('featureFlags.searchOnMap', true)
    })

    afterEach(() => {
      config.set('featureFlags.searchOnMap', false)
      config.set('mapsFrontEnd.url', null)
    })

    it('should pass the map page URL when the maps service is configured', () => {
      config.set('mapsFrontEnd.url', 'https://maps.example')
      hubController.handler(mockRequest, mockH)

      expect(mockH.view.mock.calls[0][1].mapUrl).toBe(
        'https://maps.example/map'
      )
    })

    it('should not duplicate a trailing slash on the configured URL', () => {
      config.set('mapsFrontEnd.url', 'https://maps.example/')
      hubController.handler(mockRequest, mockH)

      expect(mockH.view.mock.calls[0][1].mapUrl).toBe(
        'https://maps.example/map'
      )
    })

    it('should pass no map URL when the feature flag is off, even if the maps service is configured', () => {
      config.set('featureFlags.searchOnMap', false)
      config.set('mapsFrontEnd.url', 'https://maps.example')
      hubController.handler(mockRequest, mockH)

      expect(mockH.view.mock.calls[0][1].mapUrl).toBeNull()
    })

    it('should pass no map URL when the maps service is not configured', () => {
      config.set('mapsFrontEnd.url', null)
      hubController.handler(mockRequest, mockH)

      expect(mockH.view.mock.calls[0][1].mapUrl).toBeNull()
    })
  })

  describe('Session management', () => {
    it('should set all expected session variables', () => {
      hubController.handler(mockRequest, mockH)
      const currentYear = new Date().getFullYear().toString()
      const expectedSessionVars = [
        ['searchQuery', null],
        ['fullSearchQuery', null],
        ['searchLocation', ''],
        ['osnameapiresult', ''],
        ['selectedLocation', ''],
        ['nooflocation', ''],
        ['nooflocation', ''],
        ['yearselected', currentYear],
        ['selectedYear', currentYear],
        ['selectedpollutant', ''],
        ['selectedyear', ''],
        ['selectedlocation', ''],
        ['nooflocation', ''],
        ['selectedPollutants', null],
        ['selectedPollutantMode', ''],
        ['selectedPollutantGroup', ''],
        ['formattedPollutants', ''],
        ['selectedTimePeriod', null],
        ['yearrange', ''],
        ['finalyear', ''],
        ['finalyear1', ''],
        ['Region', ''],
        ['selectedLAIDs', ''],
        ['Location', '']
      ]
      expectedSessionVars.forEach(([key, value]) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
      })
    })
  })

  describe('Error handling', () => {
    it('should handle missing yar object', () => {
      mockRequest.yar = null

      expect(() => {
        hubController.handler(mockRequest, mockH)
      }).toThrow()
    })

    it('should handle missing h.view function', () => {
      mockH.view = null

      expect(() => {
        hubController.handler(mockRequest, mockH)
      }).toThrow()
    })

    it('should handle missing request object', () => {
      expect(() => {
        hubController.handler(null, mockH)
      }).toThrow()
    })

    it('should handle missing h object', () => {
      expect(() => {
        hubController.handler(mockRequest, null)
      }).toThrow()
    })
  })

  describe('Content integration', () => {
    it('should use englishNew.hub content structure', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
        pageTitle: englishNew.hub.pageTitle,
        texts: englishNew.hub.texts,
        mapUrl: null
      })
    })

    it('should use correct template path', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'hubpage/index',
        expect.any(Object)
      )
    })

    it('should pass only required content properties', () => {
      hubController.handler(mockRequest, mockH)

      const viewCall = mockH.view.mock.calls[0][1]

      expect(Object.keys(viewCall)).toEqual(['pageTitle', 'texts', 'mapUrl'])
      expect(viewCall).toHaveProperty('pageTitle')
      expect(viewCall).toHaveProperty('texts')
    })
  })

  describe('Year consistency', () => {
    it('should set both year variables to identical values', () => {
      hubController.handler(mockRequest, mockH)

      const yearSelectedCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'yearselected'
      )
      const selectedYearCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'selectedYear'
      )

      expect(yearSelectedCall[1]).toBe(selectedYearCall[1])
    })

    it('should use string representation of year', () => {
      hubController.handler(mockRequest, mockH)

      const yearSelectedCall = mockRequest.yar.set.mock.calls.find(
        (call) => call[0] === 'yearselected'
      )

      expect(typeof yearSelectedCall[1]).toBe('string')
      expect(yearSelectedCall[1]).toMatch(/^\d{4}$/) // Should be a 4-digit year string
    })
  })
})
