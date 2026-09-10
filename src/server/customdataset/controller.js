/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getNonAurnNetworkIdCsv } from '~/src/server/common/helpers/network-helpers.js'
import {
  invokeStationCount,
  isStationCountError,
  buildUkeapNetworks,
  toAurnNumeric
} from '~/src/server/customdataset/station-count.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

const logger = createLogger()

const CUSTOMDATASET_VIEW = 'customdataset/index'

export { invokeStationCount } from '~/src/server/customdataset/station-count.js'

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

  // clear download-specific datasource override
  request.yar.set('downloadDatasourceGroups', null)
  request.yar.set('downloadDatasourceCategoryType', '')
  request.yar.set('downloadForceNearRealtimeOnly', false)
}

function handleClearPath(request, h, backUrl) {
  clearAllSessionData(request)
  return h.view(CUSTOMDATASET_VIEW, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    selectedpollutant: request.yar.get('selectedpollutant'),
    selectedyear: request.yar.get('selectedyear'),
    selectedlocation: request.yar.get('selectedlocation'),
    stationcount: request.yar.get('nooflocation'),
    datasourceGroups: request.yar.get('datasourceGroups') || [],
    datasourceCategoryType: getDatasourceCategoryType(request),
    showLast7DaysWarning: false,
    last7DaysWarningText:
      'Only near real-time data from Defra is available for 7 days',
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
  // Last 7 days should be calculated from "now", not from selectedyear text
  if (isLast7DaysSelection(request)) {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 6) // inclusive 7-day window

    const startYear = startDate.getFullYear()
    const endYear = today.getFullYear()

    if (startYear === endYear) {
      request.yar.set('yearrange', 'Single')
      const finalyear = String(endYear)
      request.yar.set('finalyear', finalyear)
      return finalyear
    }

    request.yar.set('yearrange', 'Multiple')
    const yearList = []
    for (let y = startYear; y <= endYear; y++) {
      yearList.push(y)
    }
    const finalyear = yearList.join(',')
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

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

async function handleStationCountCalculation(request) {
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
  const nonAurnNetworkId = getNonAurnNetworkIdCsv(
    request.yar.get('datasourceGroups') || []
  )

  const [aurnCount, nonAurnCount] = await Promise.all([
    invokeStationCount({ ...baseParams, dataSource: 'AURN', networkId: '' }),
    invokeStationCount({
      ...baseParams,
      dataSource: 'NON-AURN',
      networkId: nonAurnNetworkId
    })
  ])

  // Only gate on AURN count — it is the primary station count
  if (isStationCountError(aurnCount)) {
    logger.error(
      `Station count API failed: ${aurnCount?.message || 'no response'}`
    )
    // API error — allow the user to proceed to download, which shows "unavailable"
    request.yar.set('stationCountError', true)
    request.yar.set('nooflocation', null)
    return null
  }

  const aurnNumeric = toAurnNumeric(aurnCount)

  request.yar.set('stationCountError', false)
  request.yar.set('Region', request.yar.get('selectedlocation').join(','))
  request.yar.set('stationCountAURN', aurnNumeric)
  request.yar.set('stationCountNONAURN', nonAurnCount)

  const ukeapNetworks = buildUkeapNetworks(
    nonAurnCount,
    request.yar.get('datasourceGroups') || []
  )

  // NON-AURN is an array of {networkType, count} — stored for the download page "Other data" tab
  request.yar.set('nooflocationukeap', ukeapNetworks)
  // nooflocation is always the AURN numeric count used for summary display
  request.yar.set('nooflocation', aurnNumeric)

  // If BOTH AURN and all NON-AURN counts are 0, return error asking user to change year/location
  const nonAurnTotal = ukeapNetworks.reduce(
    (sum, n) => sum + (Number(n.count) || 0),
    0
  )
  if (aurnNumeric === 0 && nonAurnTotal === 0) {
    return { bothZero: true }
  }

  return null
}

function hasAllRequiredData(request) {
  return Boolean(
    request.yar.get('selectedlocation') &&
      request.yar.get('selectedyear') &&
      request.yar.get('selectedpollutant')
  )
}

const CATEGORY_NEAR_REALTIME = 'near real-time data from defra'
const CATEGORY_OTHER = 'other data from defra'

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]/g, '')
}

function inferDatasourceCategoryTypeFromGroups(groups) {
  const normalizedCategories = (Array.isArray(groups) ? groups : []).map((g) =>
    String(g?.category || '')
      .toLowerCase()
      .trim()
  )

  const hasNearRealtime = normalizedCategories.includes(CATEGORY_NEAR_REALTIME)
  const hasOther = normalizedCategories.includes(CATEGORY_OTHER)

  if (hasNearRealtime && hasOther) return 'both'
  if (hasNearRealtime) return 'near-realtime-only'
  if (hasOther) return 'other-only'
  return 'unknown'
}

function getDatasourceCategoryType(requestOrGroups) {
  // Accept either request object or groups array
  const groups = Array.isArray(requestOrGroups)
    ? requestOrGroups
    : requestOrGroups?.yar?.get('datasourceGroups') || []

  return inferDatasourceCategoryTypeFromGroups(groups)
}

function isLast7DaysSelection(request) {
  const timeSelectionMode = normalizeToken(request.yar.get('TimeSelectionMode'))
  const selectedYear = normalizeToken(request.yar.get('selectedyear'))
  return timeSelectionMode === 'last7days' || selectedYear.includes('last7days')
}

function hasLocationSelected(request) {
  const selectedlocation = request.yar.get('selectedlocation')
  return Array.isArray(selectedlocation)
    ? selectedlocation.length > 0
    : Boolean(selectedlocation)
}

function shouldShowOtherOnlyTimePeriodError(request) {
  return (
    hasLocationSelected(request) &&
    isLast7DaysSelection(request) &&
    getDatasourceCategoryType(request.yar.get('datasourceGroups') || []) ===
      'other-only'
  )
}

function getOtherOnlyTimePeriodErrorViewModel() {
  return {
    error: true,
    errormsg:
      'There are no stations available based on your selection. Change the time period',
    errorref1: 'Change the time period',
    errorhref1: '/year-aurn/change'
  }
}

function shouldShowLast7DaysDatasourceWarning(request) {
  const isLast7Days = isLast7DaysSelection(request)

  return (
    isLast7Days &&
    getDatasourceCategoryType(request.yar.get('datasourceGroups') || []) ===
      'both'
  )
}

function renderBothZeroView(request, h, backUrl) {
  return h.view(CUSTOMDATASET_VIEW, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    selectedpollutant: request.yar.get('selectedpollutant'),
    selectedyear: request.yar.get('selectedyear'),
    selectedlocation: request.yar.get('selectedlocation'),
    stationcount: 0,
    datasourceGroups: request.yar.get('datasourceGroups') || [],
    datasourceCategoryType: getDatasourceCategoryType(request),
    showLast7DaysWarning: shouldShowLast7DaysDatasourceWarning(request),
    last7DaysWarningText:
      'Only near real-time data from Defra is available for 7 days',
    displayBacklink: true,
    hrefq: backUrl,
    error: true,
    errormsg:
      'No monitoring stations are available for your selection. Please try:',
    errorref1: 'Change the year',
    errorhref1: '/year-aurn/change',
    errorref2: 'Change the location',
    errorhref2: '/location-aurn/change'
  })
}

function renderCustomDatasetView(request, h, backUrl) {
  const groups = request.yar.get('datasourceGroups') || []
  request.yar.set(
    'Datasourceavailability',
    inferDatasourceCategoryTypeFromGroups(groups)
  )
  const showOtherOnlyError = shouldShowOtherOnlyTimePeriodError(request)

  return h.view(CUSTOMDATASET_VIEW, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    selectedpollutant: request.yar.get('selectedpollutant'),
    selectedyear: request.yar.get('selectedyear'),
    selectedlocation: request.yar.get('selectedlocation'),
    stationcount: request.yar.get('nooflocation'),
    datasourceGroups: request.yar.get('datasourceGroups') || [],
    datasourceCategoryType: getDatasourceCategoryType(request),
    showLast7DaysWarning:
      !showOtherOnlyError && shouldShowLast7DaysDatasourceWarning(request),
    last7DaysWarningText:
      'Only near real-time data from Defra is available for 7 days',
    displayBacklink: true,
    hrefq: backUrl,
    ...(showOtherOnlyError ? getOtherOnlyTimePeriodErrorViewModel() : {})
  })
}

function getNearRealtimeOnlyGroups(groups) {
  return (Array.isArray(groups) ? groups : []).filter(
    (g) =>
      normalizeToken(g?.category) === normalizeToken(CATEGORY_NEAR_REALTIME)
  )
}

function isBothAndLast7Days(request) {
  const groups = request.yar.get('datasourceGroups') || []
  return (
    isLast7DaysSelection(request) &&
    getDatasourceCategoryType(groups) === 'both'
  )
}

function setDownloadDatasourceOverrideForLast7Days(request) {
  const groups = request.yar.get('datasourceGroups') || []

  if (isBothAndLast7Days(request)) {
    const nearRealtimeOnly = getNearRealtimeOnlyGroups(groups)
    request.yar.set('downloadDatasourceGroups', nearRealtimeOnly)
    request.yar.set('downloadDatasourceCategoryType', 'near-realtime-only')
    request.yar.set('downloadForceNearRealtimeOnly', true)
    request.yar.set('selectedDatasourceType', 'AURN')
    return
  }

  request.yar.set('downloadDatasourceGroups', groups)
  request.yar.set(
    'downloadDatasourceCategoryType',
    getDatasourceCategoryType(groups)
  )
  request.yar.set('downloadForceNearRealtimeOnly', false)
}

export const customdatasetController = {
  handler: async (request, h) => {
    const backUrl = '/hubpage'

    // Allow /customdataset/clear path to work for clearing session
    if (!isInternalNavigation(request) && !request.path?.includes('/clear')) {
      return renderNotFound(h)
    }

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

    // apply download override for specific case: both categories + last 7 days
    setDownloadDatasourceOverrideForLast7Days(request)

    // Stop early for invalid: other-only datasource + last 7 days
    if (shouldShowOtherOnlyTimePeriodError(request)) {
      return renderCustomDatasetView(request, h, backUrl)
    }

    // Calculate station count if all required data is present
    if (hasAllRequiredData(request)) {
      const errorResponse = await handleStationCountCalculation(request)
      if (errorResponse?.bothZero) {
        return renderBothZeroView(request, h, backUrl)
      }
    }

    return renderCustomDatasetView(request, h, backUrl)
  }
}

// No changes required for this request
