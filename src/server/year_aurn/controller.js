/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const yearController = {
  handler(request, h) {
    // console.log('comes here at year aurn')
    // const { home } = englishNew.custom
    const backUrl = '/customdataset'
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', '2024')
    request.yar.set('selectedYear', '2025')
    // if(request.params.pollutants!=undefined)
    // {
    // request.yar.set('selectedpollutant', request.params.pollutants)

    // }
    // else{
    //   request.yar.set('selectedpollutant', '')
    // }
    return h.view('year_aurn/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: backUrl
      //  selectedpollutant: request.yar.get('selectedpollutant')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
