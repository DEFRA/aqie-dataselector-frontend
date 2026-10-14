/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'
import {
  inferDatasourceCategoryTypeFromGroups,
  getDatasourceCategoryType,
  isLast7DaysSelection,
  shouldShowOtherOnlyTimePeriodError,
  setDownloadDatasourceOverrideForLast7Days,
  isZoneSelection,
  shouldShowZoneWarning,
  shouldShowZoneOtherOnlyError,
  setDownloadDatasourceOverrideForZones
} from '~/src/server/customdataset/datasource-category.js'
import {
  handlePollutantsFromParams,
  handleTimePeriodSelection,
  handleLocationSelection
} from '~/src/server/customdataset/selection-helpers.js'
import { handleStationCountCalculation } from '~/src/server/customdataset/station-count-workflow.js'

const CUSTOMDATASET_VIEW = 'customdataset/index'
const LAST7DAYS_WARNING_TEXT =
  'Only near real-time data from Defra is available for 7 days'
const ZONE_WARNING_TEXT =
  'Only the Automatic Urban and Rural Network is available for zones'
const NO_STATIONS_ERROR_MESSAGE =
  'No monitoring stations are available for your selection. Please try:'
const CHANGE_TIME_PERIOD_TEXT = 'Change time period'
const CHANGE_TIME_PERIOD_HREF = '/year-aurn/change'
const CHANGE_LOCATION_TEXT = 'Change location'
const CHANGE_LOCATION_HREF = '/location-aurn/change'

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
  request.yar.set('nearRealtimeStationCounts', [])
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
    last7DaysWarningText: LAST7DAYS_WARNING_TEXT,
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

function hasAllRequiredData(request) {
  return Boolean(
    request.yar.get('selectedlocation') &&
      request.yar.get('selectedyear') &&
      request.yar.get('selectedpollutant')
  )
}

function getOtherOnlyTimePeriodErrorViewModel() {
  return {
    error: true,
    errormsg:
      'There are no stations available based on your selection. Change time period',
    errorref1: CHANGE_TIME_PERIOD_TEXT,
    errorhref1: CHANGE_TIME_PERIOD_HREF
  }
}

function shouldShowLast7DaysDatasourceWarning(request) {
  const isLast7Days = isLast7DaysSelection(request)
  return isLast7Days
}

function renderBothZeroView(request, h, backUrl) {
  const isZone = isZoneSelection(request)

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
    last7DaysWarningText: LAST7DAYS_WARNING_TEXT,
    showZoneWarning: shouldShowZoneWarning(request),
    zoneWarningText: ZONE_WARNING_TEXT,
    displayBacklink: true,
    hrefq: backUrl,
    error: true,
    errormsg: NO_STATIONS_ERROR_MESSAGE,
    errorref1: isZone ? CHANGE_LOCATION_TEXT : CHANGE_TIME_PERIOD_TEXT,
    errorhref1: isZone ? CHANGE_LOCATION_HREF : CHANGE_TIME_PERIOD_HREF,
    ...(isZone
      ? {}
      : {
          errorref2: CHANGE_LOCATION_TEXT,
          errorhref2: CHANGE_LOCATION_HREF
        })
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
    last7DaysWarningText: LAST7DAYS_WARNING_TEXT,
    showZoneWarning: !showOtherOnlyError && shouldShowZoneWarning(request),
    zoneWarningText: ZONE_WARNING_TEXT,
    displayBacklink: true,
    hrefq: backUrl,
    ...(showOtherOnlyError ? getOtherOnlyTimePeriodErrorViewModel() : {})
  })
}

function renderZoneOtherOnlyView(request, h, backUrl) {
  // Clear stale NON-AURN counts so the download pages block this selection too
  request.yar.set('nooflocationukeap', [])

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
    showLast7DaysWarning: false,
    last7DaysWarningText: LAST7DAYS_WARNING_TEXT,
    showZoneWarning: false,
    zoneWarningText: ZONE_WARNING_TEXT,
    displayBacklink: true,
    hrefq: backUrl,
    error: true,
    errormsg: NO_STATIONS_ERROR_MESSAGE,
    errorref1: CHANGE_LOCATION_TEXT,
    // No-JS route by default; the page script upgrades it to /location-aurn/change
    errorhref1: '/location-aurn/nojs'
  })
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

    // apply download override for zones: both categories → AURN only
    setDownloadDatasourceOverrideForZones(request)

    // Stop early for invalid: other-only datasource + last 7 days
    if (shouldShowOtherOnlyTimePeriodError(request)) {
      return renderCustomDatasetView(request, h, backUrl)
    }

    // Stop early for invalid: other-only datasource + zones
    if (shouldShowZoneOtherOnlyError(request)) {
      return renderZoneOtherOnlyView(request, h, backUrl)
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
