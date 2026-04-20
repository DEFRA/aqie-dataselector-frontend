/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { HTTP_INTERNAL_SERVER_ERROR } from '~/src/server/common/constants/magic-numbers.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

const logger = createLogger()

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
    datasourceGroups: request.yar.get('datasourceGroups') || [],
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
  if (request.path?.includes('/location')) {
    // Location selection handling logic would go here
  }
}

function parseYearRange(selectedyear, request) {
  const years = selectedyear.match(/\d{4}/g)

  if (years?.length === 2) {
    request.yar.set('yearrange', 'Multiple')
    const start = Number.parseInt(years[0], 10)
    const end = Number.parseInt(years[1], 10)
    const yearList = []
    for (let y = start; y <= end; y++) {
      yearList.push(y)
    }
    const finalyear = yearList.join(',')
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

  if (years?.length === 1) {
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

function buildStationCountParameters(request, finalyear) {
  const isCountry = request.yar.get('Location') === 'Country'
  const dataSource = request.yar.get('selectedDatasourceType') || 'AURN'
  const pollutantID = request.yar.get('selectedPollutantID')

  if (isCountry) {
    return {
      pollutantName: pollutantID,
      dataSource,
      Region: request.yar.get('selectedlocation').join(','),
      regiontype: 'Country',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }
  }

  return {
    pollutantName: pollutantID,
    dataSource,
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
  request.yar.set('finalyear1', finalyear)

  const baseParams = buildStationCountParameters(request, finalyear)

  const [aurnCount, nonAurnCount] = await Promise.all([
    invokeStationCount({ ...baseParams, dataSource: 'AURN' }),
    invokeStationCount({ ...baseParams, dataSource: 'NON-AURN' })
    // console.log('Station count results:', { aurnCount, nonAurnCount })
  ])
  // NON-AURN returns [{NetworkType, Count}, ...] — exclude arrays from error check
  const isError = (val) =>
    val == null ||
    val instanceof Error ||
    val?.isBoom === true ||
    val?.isAxiosError === true ||
    (typeof val === 'object' &&
      !Array.isArray(val) &&
      val !== null &&
      Boolean(val?.message))

  // Only gate on AURN count — it is the primary station count
  if (isError(aurnCount)) {
    logger.error(
      `Station count API failed: ${aurnCount?.message || 'no response'}`
    )
    // API error — allow the user to proceed to download, which shows "unavailable"
    request.yar.set('stationCountError', true)
    request.yar.set('nooflocation', null)
    return null
  }

  // Normalise AURN to a plain number (in case it came back as a single-entry array)
  const aurnNumeric = Array.isArray(aurnCount)
    ? aurnCount.reduce((sum, n) => sum + (Number(n.Count) || 0), 0)
    : Number(aurnCount)

  request.yar.set('stationCountError', false)
  request.yar.set('Region', request.yar.get('selectedlocation').join(','))
  request.yar.set('stationCountAURN', aurnNumeric)
  request.yar.set('stationCountNONAURN', nonAurnCount)

  // Normalise NON-AURN result: the API returns networkType:"Unknown" when count is 0.
  // Replace those with the actual network names stored in datasourceGroups so the
  // download page always shows real network headings, never "Unknown".
  const rawNonAurn = Array.isArray(nonAurnCount) ? nonAurnCount : []
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const otherDataGroup = datasourceGroups.find(
    (g) => g.category === 'Other data from Defra'
  )
  const expectedNetworks = Array.isArray(otherDataGroup?.networks)
    ? otherDataGroup.networks
    : []

  let ukeapNetworks
  if (expectedNetworks.length > 0) {
    // Build a lookup of API-returned counts (excluding "Unknown" entries)
    const apiCountMap = new Map()
    for (const n of rawNonAurn) {
      if (n.networkType && n.networkType !== 'Unknown') {
        apiCountMap.set(n.networkType, Number(n.count) || 0)
      }
    }
    // Map each expected network to its count (0 if API didn't return it or returned "Unknown")
    ukeapNetworks = expectedNetworks.map((name) => ({
      networkType: name,
      count: apiCountMap.has(name) ? apiCountMap.get(name) : 0
    }))
  } else {
    // No datasourceGroups info — use raw API result, filtering out Unknown
    ukeapNetworks = rawNonAurn.filter((n) => n.networkType !== 'Unknown')
  }

  // NON-AURN is an array of {networkType, count} — stored for the download page "Other data" tab
  request.yar.set('nooflocationukeap', ukeapNetworks)
  // nooflocation is always the AURN numeric count used for summary display
  request.yar.set('nooflocation', aurnNumeric)

  // Block on customdataset only when ALL networks have 0 stations.
  // If at least one network has stations the user can still download from that tab.
  const allUkeapZero =
    ukeapNetworks.length === 0 ||
    ukeapNetworks.every((n) => Number(n.count) === 0)

  if (aurnNumeric === 0 && allUkeapZero) {
    return h.view('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      error: true,
      errormsg: 'There are no stations available for your selection.',
      errorref1: 'Change the year',
      errorhref1: '/year-aurn',
      errorref2: 'Change the location',
      errorhref2: '/location-aurn',
      selectedpollutant: request.yar.get('selectedpollutant'),
      selectedyear: request.yar.get('selectedyear'),
      selectedlocation: request.yar.get('selectedlocation'),
      stationcount: 0,
      datasourceGroups: request.yar.get('datasourceGroups') || [],
      displayBacklink: true,
      hrefq: '/hubpage'
    })
  }

  return null
}

/**
 * Parse the raw station count API response.
 * The API returns a custom string format, not JSON:
 *   AURN  → "15"  (single number) or  Count:"15"
 *   NON-AURN → NetworkType:"X",Count:"10"[, NetworkType:"Y",Count:"5"]
 */
function parseStationCountPayload(payload) {
  if (payload == null) return null
  if (typeof payload === 'number') return payload
  if (Array.isArray(payload)) return payload

  const str = Buffer.isBuffer(payload)
    ? payload.toString('utf8').trim()
    : typeof payload === 'string'
      ? payload.trim()
      : null

  if (!str) return null

  // Pure number: "15"
  const asNum = Number(str)
  if (str !== '' && !isNaN(asNum)) return asNum

  // networkType+count pairs (case-insensitive keys) → array of {networkType, count}
  const networks = []
  const pairRe = /[Nn]etwork[Tt]ype:"([^"]+)",[Cc]ount:"([^"]+)"/g
  let m
  while ((m = pairRe.exec(str)) !== null) {
    networks.push({ networkType: m[1], count: Number(m[2]) || m[2] })
  }
  if (networks.length > 0) return networks

  // count-only: Count:"15" or count:"15"
  const countOnly = /[Cc]ount:"(\d+)"/.exec(str)
  if (countOnly) return Number(countOnly[1])

  // JSON fallback
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export async function invokeStationCount(stationcountparameters) {
  if (config.get('isDevelopment')) {
    try {
      const url = config.get('stationCountDevUrl')
      const { payload } = await Wreck.post(url, {
        payload: JSON.stringify(stationcountparameters),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      return parseStationCountPayload(payload)
    } catch (error) {
      logger.error(
        `Station count API error (local): ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return error
    }
  } else {
    try {
      const response = await axios.post(
        config.get('stationCountApiUrl'),
        stationcountparameters
      )
      return parseStationCountPayload(response.data)
    } catch (error) {
      logger.error(
        `Station count API error: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return Object.assign(
        new Error(
          `Station count API error: ${error instanceof Error ? error.message : 'unknown error'}`
        ),
        { statusCode: HTTP_INTERNAL_SERVER_ERROR }
      )
    }
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
      datasourceGroups: request.yar.get('datasourceGroups') || [],
      displayBacklink: true,
      hrefq: backUrl
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
