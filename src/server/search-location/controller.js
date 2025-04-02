import { english } from '~/src/server/data/en/homecontent.js'

const searchLocationController = {
  handler: (request, h) => {
    // const { query } = request
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.get('osnameapiresult', '')
    if (request.url.pathname === '/search-location/searchagain') {
      request.yar.set('fullSearchQuery', '')
    }
    const fullSearchQuery = request?.yar?.get('fullSearchQuery')

    if (request != null) {
      //   const x = query
      // const invalidSearchEntry = false
    }

    return h.view('search-location/index', {
      pageTitle: english.searchLocation.pageTitle,
      heading: english.searchLocation.heading,
      page: english.searchLocation.page,
      serviceName: english.searchLocation.serviceName,
      params: english.searchLocation.searchParams,
      button: english.searchLocation.button,
      displayBacklink: true,
      fullSearchQuery,
      hrefq: '/'
    })
  }
}

export { searchLocationController }
