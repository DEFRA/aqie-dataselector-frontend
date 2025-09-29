/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
import { english } from '~/src/server/data/en/homecontent.js'

export const homeController = {
  handler(request, h) {
    const { home } = english
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
      links: home.links,
      buttontxt: home.buttonText,
      subheading: home.subheading
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
