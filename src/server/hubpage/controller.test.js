import { hubController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock the data import
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    hub: {
      pageTitle: 'Test Hub Page',
      texts: ['Hub text 1', 'Hub text 2', 'Hub text 3']
    }
  }
}))

describe('hubController', () => {
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
      view: jest.fn().mockReturnValue('hub-view-response')
    }
  })

  describe('handler', () => {
    it('should return hub view with correct data', () => {
      const result = hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
        pageTitle: 'Test Hub Page',
        texts: ['Hub text 1', 'Hub text 2', 'Hub text 3']
      })
      expect(result).toBe('hub-view-response')
    })

    it('should clear all required session data on handler call', () => {
      hubController.handler(mockRequest, mockH)

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
      hubController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledTimes(8)
    })

    it('should set specific year values correctly', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')
    })

    it('should reset search-related session values to empty strings', () => {
      hubController.handler(mockRequest, mockH)

      const emptyStringValues = [
        'searchLocation',
        'osnameapiresult',
        'selectedLocation',
        'nooflocation'
      ]

      emptyStringValues.forEach((key) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, '')
      })
    })

    it('should reset query-related session values to null', () => {
      hubController.handler(mockRequest, mockH)

      const nullValues = ['searchQuery', 'fullSearchQuery']

      nullValues.forEach((key) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, null)
      })
    })

    it('should use englishNew.hub data correctly', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'hubpage/index',
        expect.objectContaining({
          pageTitle: englishNew.hub.pageTitle,
          texts: englishNew.hub.texts
        })
      )
    })

    it('should return the exact response from h.view', () => {
      const customResponse = 'custom-hub-response'
      mockH.view.mockReturnValue(customResponse)

      const result = hubController.handler(mockRequest, mockH)

      expect(result).toBe(customResponse)
    })

    it('should call h.view with correct template path', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'hubpage/index',
        expect.any(Object)
      )
    })

    it('should pass correct data structure to view', () => {
      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'hubpage/index',
        expect.objectContaining({
          pageTitle: expect.any(String),
          texts: expect.any(Array)
        })
      )
    })

    // it('should handle session setting before view rendering', () => {
    //   const mockViewSpy = jest.fn().mockReturnValue('response')
    //   mockH.view = mockViewSpy

    //   hubController.handler(mockRequest, mockH)

    //   // Verify session is set before view is called
    //   expect(mockRequest.yar.set).toHaveBeenCalledBefore(mockViewSpy)
    // })

    it('should maintain session data integrity', () => {
      hubController.handler(mockRequest, mockH)

      // Verify all expected session keys are set
      const expectedSessionCalls = [
        ['searchQuery', null],
        ['fullSearchQuery', null],
        ['searchLocation', ''],
        ['osnameapiresult', ''],
        ['selectedLocation', ''],
        ['nooflocation', ''],
        ['yearselected', '2024'],
        ['selectedYear', '2025']
      ]

      expectedSessionCalls.forEach(([key, value]) => {
        expect(mockRequest.yar.set).toHaveBeenCalledWith(key, value)
      })
    })

    it('should work with different mock data structures', () => {
      // Temporarily modify the mock
      const originalHub = englishNew.hub
      englishNew.hub = {
        pageTitle: 'Different Hub Title',
        texts: ['Different text']
      }

      hubController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
        pageTitle: 'Different Hub Title',
        texts: ['Different text']
      })

      // Restore original mock
      englishNew.hub = originalHub
    })

    it('should handle request object correctly', () => {
      const customRequest = {
        yar: {
          set: jest.fn()
        },
        customProperty: 'test'
      }

      hubController.handler(customRequest, mockH)

      expect(customRequest.yar.set).toHaveBeenCalledTimes(8)
    })

    it('should handle h object correctly', () => {
      const customH = {
        view: jest.fn().mockReturnValue('custom-response'),
        otherMethod: jest.fn()
      }

      const result = hubController.handler(mockRequest, customH)

      expect(customH.view).toHaveBeenCalledWith(
        'hubpage/index',
        expect.any(Object)
      )
      expect(result).toBe('custom-response')
      expect(customH.otherMethod).not.toHaveBeenCalled()
    })
  })
})
