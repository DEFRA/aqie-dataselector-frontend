import axios from 'axios'
import Wreck from '@hapi/wreck'
import { HTTP_INTERNAL_SERVER_ERROR } from '~/src/server/common/constants/magic-numbers.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

const logger = createLogger()

// Extract a human-readable message from a thrown value.
const errMsg = (error) =>
  error instanceof Error ? error.message : 'unknown error'

function normaliseNetworkTypeValue(entry) {
  return entry?.networkType ?? entry?.NetworkType ?? null
}

function normaliseCountValue(entry) {
  const raw = entry?.count ?? entry?.Count ?? 0
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

function aggregateNetworkCounts(networkEntries) {
  const aggregated = new Map()

  for (const entry of Array.isArray(networkEntries) ? networkEntries : []) {
    const networkType = normaliseNetworkTypeValue(entry)
    if (!networkType || networkType === 'Unknown') {
      continue
    }

    const current = aggregated.get(networkType) || 0
    aggregated.set(networkType, current + normaliseCountValue(entry))
  }

  return aggregated
}

// NON-AURN returns [{NetworkType, Count}, ...] — exclude arrays from error check
export function isStationCountError(val) {
  if (val == null || val instanceof Error) {
    return true
  }
  if (val?.isBoom === true || val?.isAxiosError === true) {
    return true
  }
  return typeof val === 'object' && !Array.isArray(val) && Boolean(val?.message)
}

/**
 * The NON-AURN networks the user selected, from session, normalised to
 * {name, id, pollutantID}. Entries may be plain strings or objects; blanks are dropped.
 * @param {Array} datasourceGroups - raw groups stored in session
 * @returns {Array<{name: string, id: (string|number|null), pollutantID: (string|null)}>}
 */
function getExpectedNetworks(datasourceGroups) {
  const otherDataGroup = datasourceGroups.find(
    (g) => g.category === 'Other data from Defra'
  )

  return (
    Array.isArray(otherDataGroup?.networks) ? otherDataGroup.networks : []
  )
    .map((network) =>
      typeof network === 'string'
        ? { name: network, id: null, pollutantID: null }
        : {
            name: network?.name || '',
            id: network?.id ?? null,
            pollutantID: network?.pollutantID ?? null
          }
    )
    .map((network) => ({
      ...network,
      name: String(network.name).trim()
    }))
    .filter((network) => Boolean(network.name))
}

/**
 * Normalise the NON-AURN result: the API returns networkType:"Unknown" when a
 * count is 0. Replace those with the actual network names stored in
 * datasourceGroups so the download page always shows real network headings,
 * never "Unknown".
 * @param {*} nonAurnCount         - raw NON-AURN station count API result
 * @param {Array} datasourceGroups - raw groups stored in session
 * @returns {Array<{networkType: string, id: *, pollutantID: *, count: number}>}
 */
export function buildUkeapNetworks(nonAurnCount, datasourceGroups) {
  const rawNonAurn = Array.isArray(nonAurnCount) ? nonAurnCount : []
  // Lookup of API-returned counts (excluding "Unknown" entries)
  const apiCountMap = aggregateNetworkCounts(rawNonAurn)
  const expectedNetworks = getExpectedNetworks(datasourceGroups)

  if (expectedNetworks.length === 0) {
    // No datasourceGroups info — use raw API result, filtering out Unknown
    return Array.from(apiCountMap.entries()).map(([networkType, count]) => ({
      networkType,
      id: null,
      pollutantID: null,
      count
    }))
  }

  // Map each expected network to its count (0 if API didn't return it or returned "Unknown")
  const matchedNetworks = expectedNetworks.map((network) => ({
    networkType: network.name,
    id: network.id,
    pollutantID: network.pollutantID,
    count: apiCountMap.has(network.name) ? apiCountMap.get(network.name) : 0
  }))

  // Include any additional network types returned by API but not present in datasourceGroups
  const expectedSet = new Set(expectedNetworks.map((network) => network.name))
  const additionalNetworks = Array.from(apiCountMap.entries())
    .filter(([name]) => !expectedSet.has(name))
    .map(([networkType, count]) => ({
      networkType,
      id: null,
      pollutantID: null,
      count
    }))

  return matchedNetworks.concat(additionalNetworks)
}

/**
 * AURN count as a plain number, in case it came back as a single-entry array.
 * @param {*} aurnCount - raw AURN station count API result
 * @returns {number}
 */
export function toAurnNumeric(aurnCount) {
  if (Array.isArray(aurnCount)) {
    return aurnCount.reduce((sum, n) => sum + (Number(n.Count) || 0), 0)
  }
  return Number(aurnCount)
}

/**
 * Parse the raw station count API response.
 * The API returns a custom string format, not JSON:
 *   AURN  → "15"  (single number) or  Count:"15"
 *   NON-AURN → NetworkType:"X",Count:"10"[, NetworkType:"Y",Count:"5"]
 */
function coercePayloadToString(payload) {
  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8').trim()
  }
  if (typeof payload === 'string') {
    return payload.trim()
  }
  return null
}

// Extract networkType+count pairs (case-insensitive keys) → array of {networkType, count}
function extractNetworkPairs(str) {
  const networks = []
  const pairRe =
    /[Nn]etwork[Tt]ype\s*:\s*"([^"]+)"\s*,\s*[Cc]ount\s*:\s*"([^"]+)"/g
  let m
  while ((m = pairRe.exec(str)) !== null) {
    const numericCount = Number(m[2])
    networks.push({
      networkType: m[1],
      count: Number.isFinite(numericCount) ? numericCount : 0
    })
  }
  return networks
}

function parseStationCountString(str) {
  // Pure number: "15"
  const asNum = Number(str)
  if (str !== '' && !Number.isNaN(asNum)) {
    return asNum
  }

  const networks = extractNetworkPairs(str)
  if (networks.length > 0) {
    return networks
  }

  // count-only: Count:"15" or count:"15"
  const countOnly = /[Cc]ount:"(\d+)"/.exec(str)
  if (countOnly) {
    return Number(countOnly[1])
  }

  // JSON fallback
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function parseStationCountPayload(payload) {
  if (payload == null) {
    return null
  }
  if (typeof payload === 'number') {
    return payload
  }
  if (Array.isArray(payload)) {
    return payload
  }

  const str = coercePayloadToString(payload)
  if (!str) {
    return null
  }

  return parseStationCountString(str)
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
      logger.error(`Station count API error (local): ${errMsg(error)}`)
      return error
    }
  }

  try {
    const response = await axios.post(
      config.get('stationCountApiUrl'),
      stationcountparameters
    )
    return parseStationCountPayload(response.data)
  } catch (error) {
    const message = `Station count API error: ${errMsg(error)}`
    logger.error(message)
    return Object.assign(new Error(message), {
      statusCode: HTTP_INTERNAL_SERVER_ERROR
    })
  }
}
