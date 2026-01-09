/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const locationaurnController = {
  handler(request, h) {
    // console.log('comes here at year aurn')
    // const { home } = englishNew.custom
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', new Date().getFullYear().toString())
    request.yar.set('selectedYear', new Date().getFullYear().toString())
    // if(request.params.pollutants!=undefined)
    // {
    // request.yar.set('selectedpollutant', request.params.pollutants)

    // }
    // else{
    //   request.yar.set('selectedpollutant', '')
    // }
    return h.view('location_aurn/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts
      //  selectedpollutant: request.yar.get('selectedpollutant')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
