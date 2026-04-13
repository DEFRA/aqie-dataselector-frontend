/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

const getStationCount = (request) => {
  const raw =
    request.yar.get('nooflocation') ?? request.yar.get('stationcount') ?? 0
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

const getUkeapStationCount = (request) => {
  const raw = request.yar.get('nooflocationukeap') ?? 0
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

const buildViewData = (request, backUrl) => {
  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    downloadaurnresult: request.yar.get('downloadaurnresult'),
    downloadukeapresult: request.yar.get('downloadukeapresult'),
    stationcount: getStationCount(request),
    stationcountukeap: getUkeapStationCount(request),
    yearrange: request.yar.get('yearrange'),
    hrefq: backUrl,
    finalyear:
      request.yar
        .get('finalyear')
        ?.split(',')
        .map((year) => year.trim()) ?? []
  }
}

const renderErrorState = (h, request, backUrl, errorDetails) => {
  const { errormsg, errorref1, errorhref1, errorref2, errorhref2 } =
    errorDetails

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
    hrefq: backUrl
  })
}

const validateSelectedPollutant = (request, h, backUrl) => {
  const selectedPollutant = request.yar.get('selectedpollutant')
  if (!selectedPollutant || selectedPollutant.length === 0) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a pollutant to continue',
      errorref1: 'Add pollutant',
      errorhref1: '/airpollutant/nojs',
      errorref2: '',
      errorhref2: ''
    })
  }
  return null
}

const validateSelectedYear = (request, h, backUrl) => {
  const selectedYear = request.yar.get('selectedyear')
  if (!selectedYear) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a year to continue',
      errorref1: 'Add year',
      errorhref1: '/year-aurn',
      errorref2: '',
      errorhref2: ''
    })
  }
  return null
}

const validateSelectedLocation = (request, h, backUrl) => {
  const selectedLocation = request.yar.get('selectedlocation')
  if (!selectedLocation) {
    return renderErrorState(h, request, backUrl, {
      errormsg: 'Select a location to continue',
      errorref1: 'Add location',
      errorhref1: '/location-aurn/nojs',
      errorref2: '',
      errorhref2: ''
    })
  }
  return null
}

const validateNumberOfLocations = (request, h, backUrl) => {
  const numberOfLocations = request.yar.get('nooflocation')
  if (
    numberOfLocations === 0 ||
    numberOfLocations === '0' ||
    !numberOfLocations
  ) {
    return renderErrorState(h, request, backUrl, {
      errormsg:
        'There are no stations available based on your selection. Change the year or location',
      errorref1: 'Change the year',
      errorhref1: '/year-aurn',
      errorref2: 'Change the location',
      errorhref2: '/location-aurn/nojs'
    })
  }
  return null
}

export const downloadDataselectornojsController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    console.log('[nojs] handler hit — method:', request.method)

    if (request.method === 'get') {
      console.log('[nojs] GET — rendering download page')
      return h.view(
        'download_dataselector_nojs/index',
        buildViewData(request, backUrl)
      )
    }

    console.log('[nojs] POST — validating session data')
    console.log(
      '[nojs] selectedpollutant:',
      request.yar.get('selectedpollutant')
    )
    console.log('[nojs] selectedyear:', request.yar.get('selectedyear'))
    console.log('[nojs] selectedlocation:', request.yar.get('selectedlocation'))
    console.log('[nojs] nooflocation (AURN):', request.yar.get('nooflocation'))
    console.log(
      '[nojs] nooflocationukeap:',
      request.yar.get('nooflocationukeap')
    )

    // Validate all required fields
    const pollutantError = validateSelectedPollutant(request, h, backUrl)
    if (pollutantError) {
      console.log('[nojs] validation failed — no pollutant selected')
      return pollutantError
    }

    const yearError = validateSelectedYear(request, h, backUrl)
    if (yearError) {
      console.log('[nojs] validation failed — no year selected')
      return yearError
    }

    const locationError = validateSelectedLocation(request, h, backUrl)
    if (locationError) {
      console.log('[nojs] validation failed — no location selected')
      return locationError
    }

    const locationsError = validateNumberOfLocations(request, h, backUrl)
    if (locationsError) {
      console.log('[nojs] validation failed — zero stations available')
      return locationsError
    }

    // Success case - render download page
    const viewData = buildViewData(request, backUrl)
    console.log(
      '[nojs] validation passed — stationcount:',
      viewData.stationcount,
      '| stationcountukeap:',
      viewData.stationcountukeap,
      '| yearrange:',
      viewData.yearrange
    )
    request.yar.set('viewDatanojs', viewData)

    return h.view('download_dataselector_nojs/index', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
