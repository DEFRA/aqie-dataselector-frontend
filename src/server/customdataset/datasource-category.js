// Datasource category helpers for the customdataset page: works out which
// datasource categories were chosen (near real-time, other, or both) and sets
// the download page overrides for "last 7 days" and zone selections.

import {
  hasAurnNetwork,
  hasNonAurnNearRealtimeNetwork,
  getAurnOnlyNearRealtimeGroups
} from '~/src/server/common/helpers/network-helpers.js'

export const OTHERONLY = 'other-only'
const BOTH = 'both'
const NEAR_REALTIME_ONLY = 'near-realtime-only'

const CATEGORY_NEAR_REALTIME = 'near real-time data from defra'
const CATEGORY_OTHER = 'other data from defra'

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]/g, '')
}

export function inferDatasourceCategoryTypeFromGroups(groups) {
  const normalizedCategories = new Set(
    (Array.isArray(groups) ? groups : []).map((g) =>
      String(g?.category || '')
        .toLowerCase()
        .trim()
    )
  )

  const hasNearRealtime = normalizedCategories.has(CATEGORY_NEAR_REALTIME)
  const hasOther = normalizedCategories.has(CATEGORY_OTHER)

  if (hasNearRealtime && hasOther) {
    return BOTH
  }
  if (hasNearRealtime) {
    return NEAR_REALTIME_ONLY
  }
  if (hasOther) {
    return OTHERONLY
  }
  return 'unknown'
}

export function getDatasourceCategoryType(requestOrGroups) {
  // Accept either request object or groups array
  const groups = Array.isArray(requestOrGroups)
    ? requestOrGroups
    : requestOrGroups?.yar?.get('datasourceGroups') || []

  return inferDatasourceCategoryTypeFromGroups(groups)
}

export function isLast7DaysSelection(request) {
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

export function shouldShowOtherOnlyTimePeriodError(request) {
  return (
    hasLocationSelected(request) &&
    isLast7DaysSelection(request) &&
    getDatasourceCategoryType(request.yar.get('datasourceGroups') || []) ===
      OTHERONLY
  )
}

function getNearRealtimeOnlyGroups(groups) {
  return (Array.isArray(groups) ? groups : []).filter(
    (g) =>
      normalizeToken(g?.category) === normalizeToken(CATEGORY_NEAR_REALTIME)
  )
}

// Download page shows only the AURN (near real-time) tab
function setNearRealtimeOnlyDownload(request, groups) {
  request.yar.set('downloadDatasourceGroups', getNearRealtimeOnlyGroups(groups))
  request.yar.set('downloadDatasourceCategoryType', NEAR_REALTIME_ONLY)
  request.yar.set('downloadForceNearRealtimeOnly', true)
  request.yar.set('selectedDatasourceType', 'AURN')
}

function isBothAndLast7Days(request) {
  const groups = request.yar.get('datasourceGroups') || []
  return (
    isLast7DaysSelection(request) && getDatasourceCategoryType(groups) === BOTH
  )
}

export function setDownloadDatasourceOverrideForLast7Days(request) {
  const groups = request.yar.get('datasourceGroups') || []

  if (isBothAndLast7Days(request)) {
    setNearRealtimeOnlyDownload(request, groups)
    return
  }

  request.yar.set('downloadDatasourceGroups', groups)
  request.yar.set(
    'downloadDatasourceCategoryType',
    getDatasourceCategoryType(groups)
  )
  request.yar.set('downloadForceNearRealtimeOnly', false)
}

// ─── Zones ─────────────────────────────────────────────────────────────────
// Zones are only available for AURN (near real-time) data.

export function isZoneSelection(request) {
  const location = request.yar.get('Location')

  return location === 'Zone' || location === 'Agglomeration'
}
export function getZoneAgglomerationWarningText(request) {
  const location = request.yar.get('Location')

  if (location === 'Agglomeration') {
    return 'Only the Automatic Urban and Rural Network is available for agglomerations'
  }

  return 'Only the Automatic Urban and Rural Network is available for zones'
}

function getZoneCategoryType(request) {
  return isZoneSelection(request)
    ? getDatasourceCategoryType(request.yar.get('datasourceGroups') || [])
    : null
}

// Zone + both AURN and other data, or AURN plus another near real-time
// network (e.g. Automatic Hydrocarbon Network): warn that only AURN is available
export function shouldShowZoneWarning(request) {
  if (getZoneCategoryType(request) === BOTH) {
    return true
  }

  const groups = request.yar.get('datasourceGroups') || []
  return (
    isZoneSelection(request) &&
    hasAurnNetwork(groups) &&
    hasNonAurnNearRealtimeNetwork(groups)
  )
}

// Zone + no AURN network (other data, or non-AURN near real-time networks
// such as the Automatic Hydrocarbon Network): there are no stations for a zone
export function isZoneWithoutAurn(request) {
  return (
    isZoneSelection(request) &&
    !hasAurnNetwork(request.yar.get('datasourceGroups') || [])
  )
}

export function shouldShowZoneNonAurnError(request) {
  return hasLocationSelected(request) && isZoneWithoutAurn(request)
}

// Zone + warning: download page shows only the near real-time tab, with only
// the AURN network in it
export function setDownloadDatasourceOverrideForZones(request) {
  if (!shouldShowZoneWarning(request)) {
    return
  }
  setNearRealtimeOnlyDownload(
    request,
    getAurnOnlyNearRealtimeGroups(request.yar.get('datasourceGroups') || [])
  )
}
