/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const homeController = {
  handler(request, h) {
    const { home } = englishNew
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', '2024')
    request.yar.set('selectedYear', '2025')
    return h.view('home/index', {
      pageTitle: home.pageTitle,
      heading: home.heading,
      text: home.texts,
      buttontxt: home.buttonText,
      subheading: home.subheading
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
