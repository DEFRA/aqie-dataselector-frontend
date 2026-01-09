/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const airpollutantController = {
  handler(request, h) {
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', '2024')
    request.yar.set('selectedYear', new Date().getFullYear().toString())
    return h.view('add_pollutant/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
