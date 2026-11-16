/**
 * Shared network helpers for AURN / NON-AURN datasource handling.
 */

const CATEGORY_NEAR_REALTIME = 'Near real-time data from Defra'

/**
 * Build a comma-separated list of unique network IDs for the
 * "Other data from Defra" (NON-AURN) group within the provided datasource
 * groups. Returns an empty string when there are none.
 */
export function getNonAurnNetworkIdCsv(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  const otherDataGroup = groups.find(
    (g) => g?.category === 'Other data from Defra'
  )
  const networks = Array.isArray(otherDataGroup?.networks)
    ? otherDataGroup.networks
    : []

  const ids = networks
    .map((network) => {
      if (typeof network === 'object' && network !== null) {
        return network.id
      }
      return null
    })
    .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
    .map((id) => String(id).trim())

  return Array.from(new Set(ids)).join(',')
}

/**
 * Networks in the "Near real-time data from Defra" group, as returned by the
 * datasource API, for display on the download page. Each item is
 * { name, isAurn }. Display only — not used for any API parameters.
 */
export function getNearRealtimeNetworks(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  const nearRealtimeGroup = groups.find(
    (g) => g?.category === CATEGORY_NEAR_REALTIME
  )
  const networks = Array.isArray(nearRealtimeGroup?.networks)
    ? nearRealtimeGroup.networks
    : []

  const names = networks
    .map((network) => (typeof network === 'string' ? network : network?.name))
    .map((name) => String(name || '').trim())
    .filter(Boolean)

  return Array.from(new Set(names)).map((name) => ({
    name,
    isAurn: /\baurn\b|automatic urban and rural/i.test(name)
  }))
}

export function isAurnNetwork(network) {
  const abbreviation = String(network?.abbreviation || '')
    .toUpperCase()
    .trim()
  const name =
    typeof network === 'string'
      ? network
      : `${network?.name || ''} ${network?.fullName || ''}`

  return (
    abbreviation === 'AURN' ||
    /\baurn\b|automatic\s+urban\s+and\s+rural/i.test(name)
  )
}

/**
 * True when the "Near real-time data from Defra" group contains the AURN
 * network. Other near real-time networks (e.g. Automatic Hydrocarbon
 * Network) are NON-AURN.
 */
export function hasAurnNetwork(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  return groups.some(
    (g) =>
      g?.category === CATEGORY_NEAR_REALTIME &&
      Array.isArray(g.networks) &&
      g.networks.some(isAurnNetwork)
  )
}

/**
 * True when the "Near real-time data from Defra" group contains a network
 * other than AURN (e.g. Automatic Hydrocarbon Network).
 */
export function hasNonAurnNearRealtimeNetwork(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  return groups.some(
    (g) =>
      g?.category === CATEGORY_NEAR_REALTIME &&
      Array.isArray(g.networks) &&
      g.networks.some((network) => !isAurnNetwork(network))
  )
}

/**
 * Only the "Near real-time data from Defra" group, keeping just its AURN
 * network(s). Zones and agglomerations only have AURN data.
 */
export function getAurnOnlyNearRealtimeGroups(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  return groups
    .filter((g) => g?.category === CATEGORY_NEAR_REALTIME)
    .map((g) => ({
      ...g,
      networks: (Array.isArray(g.networks) ? g.networks : []).filter(
        isAurnNetwork
      )
    }))
}

/**
 * Near real-time networks and their station counts for the download page.
 * Zones and agglomerations only have AURN data, so other near real-time
 * networks are left out for them.
 */
export function getDownloadNearRealtimeNetworks(request) {
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const stationCounts = request.yar.get('nearRealtimeStationCounts')
  const location = request.yar.get('Location')

  if (location !== 'Zone' && location !== 'Agglomeration') {
    return {
      networks: getNearRealtimeNetworks(datasourceGroups),
      stationCounts
    }
  }

  return {
    networks: getNearRealtimeNetworks(
      getAurnOnlyNearRealtimeGroups(datasourceGroups)
    ),
    stationCounts: Array.isArray(stationCounts)
      ? stationCounts.filter((row) => row?.isAurn)
      : stationCounts
  }
}

/**
 * Unique pollutant IDs of the AURN network(s) in the near real-time group.
 * A network's pollutantID may be a comma-separated list.
 */
export function getAurnPollutantIds(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  const ids = groups
    .filter((g) => g?.category === CATEGORY_NEAR_REALTIME)
    .flatMap((g) => (Array.isArray(g.networks) ? g.networks : []))
    .filter((network) => typeof network === 'object' && isAurnNetwork(network))
    .flatMap((network) => String(network.pollutantID || '').split(','))
    .map((id) => id.trim())
    .filter(Boolean)

  return Array.from(new Set(ids))
}
