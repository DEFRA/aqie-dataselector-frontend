import { searchLocationController } from '~/src/server/search-location/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('searchLocationController', () => {
  let request, h

  beforeEach(() => {
    request = {
      url: { pathname: '/search-location' },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn().mockReturnValue('view-response')
    }
  })

  it('should clear session and render search-location/index with fullSearchQuery', () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'fullSearchQuery') return 'TestQuery'
      return ''
    })

    const result = searchLocationController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('errors', '')
    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', '')
    expect(request.yar.get).toHaveBeenCalledWith('osnameapiresult', '')
    expect(h.view).toHaveBeenCalledWith('search-location/index', {
      pageTitle: english.searchLocation.pageTitle,
      heading: english.searchLocation.heading,
      page: english.searchLocation.page,
      serviceName: english.searchLocation.serviceName,
      params: english.searchLocation.searchParams,
      button: english.searchLocation.button,
      displayBacklink: true,
      fullSearchQuery: 'TestQuery',
      hrefq: '/hubpage' // Updated to match controller
    })

    expect(result).toBe('view-response')
  })

  it('should reset fullSearchQuery if pathname is /search-location/searchagain', () => {
    request.url.pathname = '/search-location/searchagain'
    request.yar.get.mockReturnValue('')

    searchLocationController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('fullSearchQuery', '')
    expect(request.yar.set).toHaveBeenCalledWith('errors', '')
    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', '')
    expect(request.yar.get).toHaveBeenCalledWith('osnameapiresult', '')
  })

  it('should handle undefined fullSearchQuery correctly', () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'fullSearchQuery') return undefined
      return ''
    })

    const result = searchLocationController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('search-location/index', {
      pageTitle: english.searchLocation.pageTitle,
      heading: english.searchLocation.heading,
      page: english.searchLocation.page,
      serviceName: english.searchLocation.serviceName,
      params: english.searchLocation.searchParams,
      button: english.searchLocation.button,
      displayBacklink: true,
      fullSearchQuery: undefined,
      hrefq: '/hubpage'
    })

    expect(result).toBe('view-response')
  })

  it('should handle empty fullSearchQuery correctly', () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'fullSearchQuery') return ''
      return ''
    })

    const result = searchLocationController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('search-location/index', {
      pageTitle: english.searchLocation.pageTitle,
      heading: english.searchLocation.heading,
      page: english.searchLocation.page,
      serviceName: english.searchLocation.serviceName,
      params: english.searchLocation.searchParams,
      button: english.searchLocation.button,
      displayBacklink: true,
      fullSearchQuery: '',
      hrefq: '/hubpage'
    })

    expect(result).toBe('view-response')
  })

  it('should call all session operations in the correct order', () => {
    request.yar.get.mockReturnValue('test')

    searchLocationController.handler(request, h)

    // Verify the sequence of yar operations
    expect(request.yar.set).toHaveBeenNthCalledWith(1, 'errors', '')
    expect(request.yar.set).toHaveBeenNthCalledWith(2, 'errorMessage', '')
    expect(request.yar.get).toHaveBeenCalledWith('osnameapiresult', '')
    expect(request.yar.get).toHaveBeenCalledWith('fullSearchQuery')
  })

  it('should not reset fullSearchQuery for other pathnames', () => {
    request.url.pathname = '/search-location/other'
    request.yar.get.mockReturnValue('ExistingQuery')

    searchLocationController.handler(request, h)

    // Should not call set for fullSearchQuery
    expect(request.yar.set).not.toHaveBeenCalledWith('fullSearchQuery', '')
    expect(request.yar.set).toHaveBeenCalledWith('errors', '')
    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', '')
  })

  it('should handle missing yar object gracefully', () => {
    request.yar = null

    expect(() => {
      searchLocationController.handler(request, h)
    }).toThrow()
  })

  it('should handle missing url object gracefully', () => {
    request.url = null
    request.yar.get.mockReturnValue('test')

    expect(() => {
      searchLocationController.handler(request, h)
    }).toThrow()
  })

  it('should render view with all required properties', () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'fullSearchQuery') return 'MySearchQuery'
      return ''
    })

    searchLocationController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('search-location/index', {
      pageTitle: expect.any(String),
      heading: expect.any(String),
      page: expect.anything(),
      serviceName: expect.any(String),
      params: expect.anything(),
      button: expect.anything(),
      displayBacklink: true,
      fullSearchQuery: 'MySearchQuery',
      hrefq: '/hubpage'
    })
  })
})
