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
      view: jest.fn()
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
    expect(h.view).toHaveBeenCalledWith('search-location/index', {
      pageTitle: english.searchLocation.pageTitle,
      heading: english.searchLocation.heading,
      page: english.searchLocation.page,
      serviceName: english.searchLocation.serviceName,
      params: english.searchLocation.searchParams,
      button: english.searchLocation.button,
      displayBacklink: true,
      fullSearchQuery: 'TestQuery',
      hrefq: '/'
    })

    expect(result).toBe(h.view('search-location/index', expect.any(Object)))
  })

  it('should reset fullSearchQuery if pathname is /search-location/searchagain', () => {
    request.url.pathname = '/search-location/searchagain'
    request.yar.get.mockReturnValue('')

    searchLocationController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('fullSearchQuery', '')
  })
})
