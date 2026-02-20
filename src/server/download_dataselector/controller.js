/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const downloadDataselectorController = {
  handler(request, h) {
    const backUrl = '/customdataset'
    // Helper function to render error state
    // console.log('In download controller', request.yar.get('nooflocation'))
    const renderErrorState = (
      errormsg,
      errorref1,
      errorhref1,
      errorref2,
      errorhref2
    ) => {
      const errorViewData = {
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
        displayBacklink: true,
        hrefq: backUrl
      }

      // Store error view data in session
      request.yar.set('errorViewData', errorViewData)

      return h.view('customdataset/index', errorViewData)
    }

    // Validation checks
    const selectedPollutant = request.yar.get('selectedpollutant')
    const selectedYear = request.yar.get('selectedyear')
    const selectedLocation = request.yar.get('selectedlocation')

    if (!selectedPollutant || selectedPollutant.length === 0) {
      return renderErrorState(
        'Select a pollutant to continue',
        'Add pollutant',
        '/airpollutant',
        '',
        ''
      )
    }

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
        '/location-aurn?change=true',
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

    // Clear any previous download result to prevent auto-download
    request.yar.set('downloadaurnresult', null)

    // Success case - prepare view data
    const successViewData = {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: null, // Don't auto-download, wait for user to click
      stationcount: request.yar.get('nooflocation'),
      yearrange: request.yar.get('yearrange'),
      displayBacklink: true,
      hrefq: backUrl,
      finalyear:
        request.yar
          .get('finalyear')
          ?.split(',')
          .map((year) => year.trim()) ?? []
    }

    // Store success view data in session
    request.yar.set('downloadViewData', successViewData)

    // Also store individual components for easier access

    // Success case - render download page
    return h.view('download_dataselector/index', successViewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
