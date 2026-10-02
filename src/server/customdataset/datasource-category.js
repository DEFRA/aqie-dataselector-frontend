// Datasource category helpers for the customdataset page: works out which
// datasource categories were chosen (near real-time, other, or both) and sets
// the download page overrides for "last 7 days" and zone selections.

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
  return request.yar.get('Location') === 'Zone'
}

function getZoneCategoryType(request) {
  return isZoneSelection(request)
    ? getDatasourceCategoryType(request.yar.get('datasourceGroups') || [])
    : null
}

// Zone + both AURN and other data: warn that only AURN is available
export function shouldShowZoneWarning(request) {
  return getZoneCategoryType(request) === BOTH
}

// Zone + other data only: there are no stations for a zone
export function shouldShowZoneOtherOnlyError(request) {
  return (
    hasLocationSelected(request) && getZoneCategoryType(request) === OTHERONLY
  )
}

// Zone + both: download page shows only the AURN (near real-time) tab
export function setDownloadDatasourceOverrideForZones(request) {
  if (!shouldShowZoneWarning(request)) {
    return
  }
  setNearRealtimeOnlyDownload(
    request,
    request.yar.get('datasourceGroups') || []
  )
}
