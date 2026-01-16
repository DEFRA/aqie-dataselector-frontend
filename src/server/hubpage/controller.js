/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const hubController = {
  handler(request, h) {
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', new Date().getFullYear().toString())
    request.yar.set('selectedYear', new Date().getFullYear().toString())

    return h.view('hubpage/index', {
      pageTitle: englishNew.hub.pageTitle,
      texts: englishNew.hub.texts
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
