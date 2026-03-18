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

const buildViewData = (request, backUrl) => {
  return {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    downloadaurnresult: request.yar.get('downloadaurnresult'),
    stationcount: getStationCount(request),
    yearrange: request.yar.get('yearrange'),
    hrefq: backUrl,
    finalyear:
      request.yar
        .get('finalyear')
        ?.split(',')
        .map((year) => year.trim()) ?? []
  }
}

const renderErrorState = (
  h,
  errormsg,
  errorref1,
  errorhref1,
  errorref2,
  errorhref2,
  request,
  backUrl
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
    hrefq: backUrl
  })
}

const validateSelectedPollutant = (request, h, backUrl) => {
  const selectedPollutant = request.yar.get('selectedpollutant')
  if (!selectedPollutant || selectedPollutant.length === 0) {
    return renderErrorState(
      h,
      'Select a pollutant to continue',
      'Add pollutant',
      '/airpollutant/nojs',
      '',
      '',
      request,
      backUrl
    )
  }
  return null
}

const validateSelectedYear = (request, h, backUrl) => {
  const selectedYear = request.yar.get('selectedyear')
  if (!selectedYear) {
    return renderErrorState(
      h,
      'Select a year to continue',
      'Add year',
      '/year-aurn',
      '',
      '',
      request,
      backUrl
    )
  }
  return null
}

const validateSelectedLocation = (request, h, backUrl) => {
  const selectedLocation = request.yar.get('selectedlocation')
  if (!selectedLocation) {
    return renderErrorState(
      h,
      'Select a location to continue',
      'Add location',
      '/location-aurn/nojs',
      '',
      '',
      request,
      backUrl
    )
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
    return renderErrorState(
      h,
      'There are no stations available based on your selection. Change the year or location',
      'Change the year',
      '/year-aurn',
      'Change the location',
      '/location-aurn/nojs',
      request,
      backUrl
    )
  }
  return null
}

export const downloadDataselectornojsController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    if (request.method === 'get') {
      return h.view(
        'download_dataselector_nojs/index',
        buildViewData(request, backUrl)
      )
    }

    // Validate all required fields
    const pollutantError = validateSelectedPollutant(request, h, backUrl)
    if (pollutantError) return pollutantError

    const yearError = validateSelectedYear(request, h, backUrl)
    if (yearError) return yearError

    const locationError = validateSelectedLocation(request, h, backUrl)
    if (locationError) return locationError

    const locationsError = validateNumberOfLocations(request, h, backUrl)
    if (locationsError) return locationsError

    // Success case - render download page
    const viewData = buildViewData(request, backUrl)
    request.yar.set('viewDatanojs', viewData)

    return h.view('download_dataselector_nojs/index', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
