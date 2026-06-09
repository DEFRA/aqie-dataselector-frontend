/**
 * Shared network helpers for AURN / NON-AURN datasource handling.
 */

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
