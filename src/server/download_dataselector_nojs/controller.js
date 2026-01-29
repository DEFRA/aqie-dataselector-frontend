/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const downloadDataselectornojsController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    const getStationCount = () => {
      const raw =
        request.yar.get('nooflocation') ?? request.yar.get('stationcount') ?? 0
      const num = Number(raw)
      return Number.isFinite(num) ? num : 0
    }

    if (request.method === 'get') {
      return h.view('download_dataselector_nojs/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: request.yar.get('downloadaurnresult'),
        stationcount: getStationCount(), // always a number
        yearrange: request.yar.get('yearrange'),
        //  displayBacklink: true,
        hrefq: backUrl,
        finalyear:
          request.yar
            .get('finalyear')
            ?.split(',')
            .map((year) => year.trim()) ?? []
      })
    }

    //  const calledFrom = request.headers.referer || request.info.referrer || ''
    // console.log('comes to controllernojs of dataselector', request.url?.href || request.path)
    // console.log('Referrer (page called from):', calledFrom)
    // Helper function to render error state
    // console.log('In download controller', request.yar.get('nooflocation'))
    const renderErrorState = (
      errormsg,
      errorref1,
      errorhref1,
      errorref2,
      errorhref2
    ) => {
      return h.view('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        error: true,
        errormsg,
        errorref1,
        errorhref1,
        errorref2,
        errorhref2,
        selectedpollutant: request.yar.get('selectedpollutant'),
        selectedyear: request.yar.get('selectedyear'),
        selectedlocation: request.yar.get('selectedlocation'),
        stationcount: request.yar.get('nooflocation'),
        //  displayBacklink: true,
        hrefq: backUrl
      })
    }

    // Validation checks
    const selectedYear = request.yar.get('selectedyear')
    const selectedLocation = request.yar.get('selectedlocation')

    if (!selectedYear) {
      return renderErrorState(
        'Select a year to continue',
        'Add year',
        '/year-aurn',
        '',
        ''
      )
    }

    if (!selectedLocation) {
      return renderErrorState(
        'Select a location to continue',
        'Add location',
        '/location-aurn',
        '',
        ''
      )
    }

    const numberOfLocations = request.yar.get('nooflocation')
    // console.log(
    //   'Number of locations:',
    //   numberOfLocations,
    //   'Type:',
    //   typeof numberOfLocations
    // )

    if (
      numberOfLocations === 0 ||
      numberOfLocations === '0' ||
      !numberOfLocations
    ) {
      // console.log('no stations found')
      return renderErrorState(
        'There are no stations available based on your selection. Change the year or location',
        'Change the year',
        '/year-aurn',
        'Change the location',
        '/location-aurn'
      )
    }

    // Success case - render download page
    return h.view('download_dataselector_nojs/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: request.yar.get('downloadaurnresult'),
      stationcount: getStationCount(), // always a number
      yearrange: request.yar.get('yearrange'),
      // displayBacklink: true,
      hrefq: backUrl,
      finalyear:
        request.yar
          .get('finalyear')
          ?.split(',')
          .map((year) => year.trim()) ?? []
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
