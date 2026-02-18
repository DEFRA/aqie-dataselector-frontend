/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
// import { error } from 'node:console'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
// import Wreck from '@hapi/wreck'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const STATIONCOUNT_TIMEOUT_MS = 50000

const errorContent = english.errorpages

function statusCodeMessage(statusCode) {
  switch (true) {
    case statusCode === 404:
      return 'Page not found'
    case statusCode === 403:
      return 'Forbidden'
    case statusCode === 401:
      return 'Unauthorized'
    case statusCode === 400:
      return 'Bad Request'
    case statusCode === 500:
      return 'Sorry, there is a problem with the service'
    default:
      return 'Sorry, there is a problem with the service'
  }
}

function extractStatusCode(maybeError) {
  const candidate =
    maybeError?.response?.status ??
    maybeError?.output?.statusCode ??
    maybeError?.statusCode ??
    maybeError?.status

  if (typeof candidate === 'number' && candidate >= 100 && candidate <= 599) {
    return candidate
  }

  const message = maybeError?.message
  if (typeof message === 'string') {
    const match = message.match(/\b([1-5]\d\d)\b/)
    if (match) {
      return Number(match[1])
    }
  }

  return 500
}

function renderErrorPage(h, statusCode) {
  const message = statusCodeMessage(statusCode)
  return h
    .view('error/index', {
      pageTitle: message,
      statusCode,
      message,
      content: errorContent
    })
    .code(statusCode)
}

function clearAllSessionData(request) {
  // Clear all selected options and pollutants
  request.yar.set('selectedpollutant', '')
  request.yar.set('selectedyear', '')
  request.yar.set('selectedlocation', '')
  request.yar.set('nooflocation', '')

  // Clear pollutant-specific session variables
  request.yar.set('selectedPollutants', null)
  request.yar.set('selectedPollutantMode', '')
  request.yar.set('selectedPollutantGroup', '')
  request.yar.set('selectedpollutants_specific', [])
  request.yar.set('selectedpollutants_group', [])
  request.yar.set('formattedPollutants', '')

  // Clear other related session variables including time period
  request.yar.set('selectedTimePeriod', null)
  request.yar.set('yearrange', '')
  request.yar.set('finalyear', '')
  request.yar.set('finalyear1', '')
  request.yar.set('Region', '')
  request.yar.set('selectedLAIDs', '')
  request.yar.set('Location', '')

  // Clear year selection mode and related year data
  request.yar.set('TimeSelectionMode', '')
  request.yar.set('yearany', '')
  request.yar.set('startYear', '')
  request.yar.set('endYear', '')
  request.yar.set('startyear_ytd', '')
}

function handleClearPath(request, h, backUrl) {
  clearAllSessionData(request)

  return h.view('customdataset/index', {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    selectedpollutant: request.yar.get('selectedpollutant'),
    selectedyear: request.yar.get('selectedyear'),
    selectedlocation: request.yar.get('selectedlocation'),
    stationcount: request.yar.get('nooflocation'),
    displayBacklink: true,
    hrefq: backUrl
  })
}

function handleNullPollutantsError(request, h) {
  const errorData = englishNew.custom.errorText.uk
  const errorSection = errorData?.fields
  setErrorMessage(request, errorSection?.title, errorSection?.text)
  const errors = request.yar?.get('errors')
  const errorMessage = request.yar?.get('errorMessage')
  request.yar.set('errors', '')
  request.yar.set('errorMessage', '')

  // Check if JavaScript is disabled by looking for noscript indicator
  const isNoJS =
    request.headers['user-agent']?.includes('noscript') ||
    request.query?.nojs === 'true' ||
    !request.headers.accept?.includes('text/javascript')

  const templatePath = isNoJS
    ? 'add_pollutant/index_nojs'
    : 'add_pollutant/index'

  return h.view(templatePath, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    errors,
    errorMessage,
    displayBacklink: true,
    hrefq: '/customdataset'
  })
}

function getCorePollutants() {
  return [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)'
  ]
}

function getCompliancePollutants() {
  return [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)',
    'Nitric oxide (NO)',
    'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
    'Carbon monoxide (CO)'
  ]
}

function parsePollutantArray(selectedpollutant) {
  if (selectedpollutant.length === 1 && selectedpollutant[0].includes(',')) {
    return selectedpollutant[0].split(',').map((s) => s.trim())
  }
  return selectedpollutant
}

function parsePollutantString(selectedpollutant) {
  return selectedpollutant.split(',').map((s) => s.trim())
}

function processPollutantSelection(selectedpollutant) {
  if (selectedpollutant === 'core') {
    return getCorePollutants()
  }

  if (selectedpollutant === 'compliance') {
    return getCompliancePollutants()
  }

  if (Array.isArray(selectedpollutant)) {
    return parsePollutantArray(selectedpollutant)
  }

  if (typeof selectedpollutant === 'string') {
    return parsePollutantString(selectedpollutant)
  }

  return selectedpollutant
}

function handlePollutantsFromParams(request) {
  const sessionPollutants = request.yar.get('selectedPollutants')
  if (sessionPollutants && sessionPollutants.length > 0) {
    request.yar.set('selectedpollutant', sessionPollutants)
    return
  }

  if (request.params.pollutants === undefined) {
    return
  }

  const selectedpollutant = processPollutantSelection(request.params.pollutants)
  request.yar.set('selectedpollutant', selectedpollutant)
}

function handleTimePeriodSelection(request) {
  const sessionTimePeriod = request.yar.get('selectedTimePeriod')
  if (sessionTimePeriod) {
    request.yar.set('selectedyear', sessionTimePeriod)
    return
  }

  if (request.path?.includes('/year')) {
    request.yar.set('selectedyear', request.params.year)
  }
}

function handleLocationSelection(request) {
  if (!request.path?.includes('/location')) {
    return
  }

  let selectedCountry = request.payload.country
  if (selectedCountry && !Array.isArray(selectedCountry)) {
    selectedCountry = [selectedCountry]
  }
}

function parseYearRange(selectedyear, request) {
  const years = selectedyear.match(/\d{4}/g)

  if (years && years.length === 2) {
    request.yar.set('yearrange', 'Multiple')
    const start = parseInt(years[0], 10)
    const end = parseInt(years[1], 10)
    const yearList = []
    for (let y = start; y <= end; y++) {
      yearList.push(y)
    }
    const finalyear = yearList.join(',')
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

  if (years && years.length === 1) {
    request.yar.set('yearrange', 'Single')
    const finalyear = years[0]
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

  return ''
}

function getPollutantNames() {
  return {
    'Fine particulate matter (PM2.5)': 'PM2.5',
    'Particulate matter (PM10)': 'PM10',
    'Nitrogen dioxide (NO2)': 'Nitrogen dioxide',
    'Ozone (O3)': 'Ozone',
    'Sulphur dioxide (SO2)': 'Sulphur dioxide',
    'Nitric oxide (NO)': null,
    'Nitrogen oxides as nitrogen dioxide (NOx as NO2)':
      'Nitrogen oxides as nitrogen dioxide',
    'Carbon monoxide (CO)': 'Carbon monoxide'
  }
}

function buildStationCountParameters(request, finalyear, formattedPollutants) {
  const isCountry = request.yar.get('Location') === 'Country'

  if (isCountry) {
    return {
      pollutantName: formattedPollutants,
      dataSource: 'AURN',
      Region: request.yar.get('selectedlocation').join(','),
      regiontype: 'Country',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }
  }

  return {
    pollutantName: formattedPollutants,
    dataSource: 'AURN',
    Region: request.yar.get('selectedLAIDs'),
    regiontype: 'LocalAuthority',
    Year: finalyear,
    dataselectorfiltertype: 'dataSelectorCount',
    dataselectordownloadtype: ''
  }
}

async function handleStationCountCalculation(request, h) {
  const selectedyear = request.yar.get('selectedyear')
  const finalyear = parseYearRange(selectedyear, request)

  const pollutantNames = getPollutantNames()
  const formattedPollutants = request.yar
    .get('selectedpollutant')
    .map((p) => pollutantNames[p] || p)
    .join(',')

  request.yar.set('formattedPollutants', formattedPollutants)

  const stationcountparameters = buildStationCountParameters(
    request,
    finalyear,
    formattedPollutants
  )

  request.yar.set('finalyear1', finalyear)
  const stationcount = await Invokestationcount(stationcountparameters)

  if (
    stationcount == null ||
    stationcount instanceof Error ||
    stationcount?.isAxiosError ||
    (typeof stationcount === 'object' && stationcount?.message)
  ) {
    const statusCode = extractStatusCode(stationcount)
    logger.error(
      `Station count API failed: statusCode=${statusCode} message=${
        stationcount?.message || 'no response'
      }`
    )
    return renderErrorPage(h, statusCode)
  }

  request.yar.set('Region', request.yar.get('selectedlocation').join(','))
  request.yar.set('nooflocation', stationcount)
  return null
}

async function Invokestationcount(stationcountparameters) {
  try {
    const url = config.get('Download_aurn_URL')
    if (!url) {
      return Object.assign(new Error('Missing Download_aurn_URL'), {
        statusCode: 500
      })
    }
    const response = await axios.post(url, stationcountparameters, {
      timeout: STATIONCOUNT_TIMEOUT_MS,
      validateStatus: () => true
    })

    if (!response || response.status < 200 || response.status >= 300) {
      return Object.assign(
        new Error(`Station count API returned status ${response?.status}`),
        {
          statusCode: response?.status || 500,
          response
        }
      )
    }

    if (response.data == null) {
      return Object.assign(new Error('Station count API returned no data'), {
        statusCode: 500,
        response
      })
    }

    return response.data
  } catch (error) {
    return error
  }
}

export const customdatasetController = {
  handler: async (request, h) => {
    const backUrl = '/hubpage'

    if (request.path?.includes('/clear')) {
      return handleClearPath(request, h, backUrl)
    }

    if (request.params.pollutants === 'null') {
      return handleNullPollutantsError(request, h)
    }

    // Handle pollutants, time period, and location
    handlePollutantsFromParams(request)
    handleTimePeriodSelection(request)
    handleLocationSelection(request)

    // Calculate station count if all required data is present
    const hasAllRequiredData =
      request.yar.get('selectedlocation') &&
      request.yar.get('selectedyear') &&
      request.yar.get('selectedpollutant')

    if (hasAllRequiredData) {
      const errorResponse = await handleStationCountCalculation(request, h)
      if (errorResponse) {
        return errorResponse
      }
    }

    return h.view('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      selectedpollutant: request.yar.get('selectedpollutant'),
      selectedyear: request.yar.get('selectedyear'),
      selectedlocation: request.yar.get('selectedlocation'),
      stationcount: request.yar.get('nooflocation'),
      displayBacklink: true,
      hrefq: backUrl
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
