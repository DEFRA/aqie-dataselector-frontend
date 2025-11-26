/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const downloadDataselectorController = {
  handler(request, h) {
    // const { home } = englishNew.custom

    // console.log('stationcount in download', request.yar.get('nooflocation'))
    const backUrl = '/customdataset'
    return h.view('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: request.yar.get('downloadaurnresult'),
      stationcount: request.yar.get('nooflocation'),
      yearrange: request.yar.get('yearrange'),
      displayBacklink: true,
      hrefq: backUrl,
      finalyear:
        request.yar
          .get('finalyear')
          ?.split(',')
          .map((year) => year.trim()) ?? []
      //   finalyear: request.yar.get('finalyear')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
