/**
 * Datasource controller — fetches available data sources for the selected
 * pollutant from the API and renders the datasource page.
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'
import { networkData } from '~/src/server/data/en/networks.js'
import { invokeStationCount } from '~/src/server/customdataset/controller.js'
import { getNonAurnNetworkIdCsv } from '~/src/server/common/helpers/network-helpers.js'

const logger = createLogger()

// Extract a human-readable message from a thrown value.
const errMsg = (error) =>
  error instanceof Error ? error.message : 'unknown error'

// Build lowercase name/fullName → network entry lookup
const networkLookup = new Map()
for (const entry of Object.values(networkData)) {
  if (entry.name) {
    networkLookup.set(entry.name.toLowerCase().trim(), entry)
  }
  if (entry.fullName) {
    networkLookup.set(entry.fullName.toLowerCase().trim(), entry)
  }
}

function lookupNetwork(name) {
  return networkLookup.get((name || '').toLowerCase().trim()) || null
}

// Enrich raw string groups with full metadata; also build "other" groups
function enrichGroupsAndBuildOther(rawGroups) {
  const usedAbbreviations = new Set()

  const enrichedGroups = rawGroups.map((group) => ({
    category: group.category,
    networks: group.networks.map((network) => {
      const networkName = typeof network === 'string' ? network : network?.name
      const meta = lookupNetwork(networkName)
      if (meta) {
        usedAbbreviations.add(meta.abbreviation)
      }
      if (meta && typeof network === 'object' && network) {
        return { ...meta, ...network }
      }
      return meta || { ...network, name: networkName, fullName: networkName }
    })
  }))

  const otherByCategory = {}
  for (const entry of Object.values(networkData)) {
    if (!usedAbbreviations.has(entry.abbreviation)) {
      if (!otherByCategory[entry.category]) {
        otherByCategory[entry.category] = []
      }
      otherByCategory[entry.category].push(entry)
    }
  }

  const otherGroups = Object.entries(otherByCategory).map(
    ([category, networks]) => ({ category, networks })
  )

  return { enrichedGroups, otherGroups }
}

// Known category headers returned by the API
const KNOWN_CATEGORIES = new Set([
  'Near real-time data from Defra',
  'Other data from Defra'
])

async function fetchDatasourceDev(body, pollutantID) {
  try {
    const url = config.get('datasourceDevUrl')
    const { payload } = await Wreck.post(url, {
      payload: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.get('osNamesDevApiKey')
      },
      json: true
    })

    const result = Array.isArray(payload) ? payload : []

    logger.info(
      `Datasource API returned ${result.length} items for pollutantID ${pollutantID}`
    )
    return result
  } catch (error) {
    logger.error(
      `Datasource API call failed for pollutantID ${pollutantID}: ${errMsg(error)}`
    )
    return null
  }
}

async function fetchDatasourceProd(body, pollutantID) {
  try {
    const response = await axios.post(config.get('datasourceApiUrl'), body)
    const result = Array.isArray(response.data) ? response.data : []
    logger.info(
      `Datasource API returned ${result.length} items for pollutantID ${pollutantID}`
    )
    return result
  } catch (error) {
    logger.error(
      `Datasource API call failed for pollutantID ${pollutantID}: ${errMsg(error)}`
    )
    return null
  }
}

// POST pollutantID to the API, returns flat array of strings
export async function fetchDatasourceForPollutant(pollutantID) {
  const body = { pollutantID: String(pollutantID) }
  logger.info(`Fetching data sources for pollutantID ${pollutantID}`)

  return config.get('isDevelopment')
    ? fetchDatasourceDev(body, pollutantID)
    : fetchDatasourceProd(body, pollutantID)
}

// Parse flat array ["Category", "Network", "Category", "Network", ...]
// into [{ category: "Category", networks: ["Network", ...] }, ...]
export function groupDatasources(flat) {
  if (
    Array.isArray(flat) &&
    flat.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.category === 'string' &&
        Array.isArray(item.networks)
    )
  ) {
    return flat
  }

  const groups = []
  let currentGroup = null

  for (const item of flat) {
    if (KNOWN_CATEGORIES.has(item)) {
      currentGroup = { category: item, networks: [] }
      groups.push(currentGroup)
    } else if (currentGroup) {
      currentGroup.networks.push(item)
    } else {
      // Leading network with no preceding category header — ignore it
    }
  }

  return groups
}

// Re-trigger the station count with the new datasource type when all the
// required selection data is present in the session.
async function recalculateStationCount(request, datasourceType) {
  const finalyear = request.yar.get('finalyear1')
  const pollutantID = request.yar.get('selectedPollutantID')
  const selectedlocation = request.yar.get('selectedlocation')
  const selectedLAIDs = request.yar.get('selectedLAIDs')
  const isCountry = request.yar.get('Location') === 'Country'

  if (!(finalyear && pollutantID && selectedlocation)) {
    return
  }

  const postDatasourceGroups = request.yar.get('datasourceGroups') || []
  const nonAurnNetworkId = getNonAurnNetworkIdCsv(postDatasourceGroups)
  const baseParams = {
    pollutantName: pollutantID,
    Region: isCountry ? selectedlocation.join(',') : selectedLAIDs,
    regiontype: isCountry ? 'Country' : 'LocalAuthority',
    Year: finalyear,
    dataselectorfiltertype: 'dataSelectorCount',
    dataselectordownloadtype: ''
  }
  try {
    const [aurnCount, nonAurnCount] = await Promise.all([
      invokeStationCount({ ...baseParams, dataSource: 'AURN', networkId: '' }),
      invokeStationCount({
        ...baseParams,
        dataSource: 'NON-AURN',
        networkId: nonAurnNetworkId
      })
    ])
    request.yar.set('stationCountAURN', aurnCount)
    request.yar.set('stationCountNONAURN', nonAurnCount)
    request.yar.set('nooflocationukeap', nonAurnCount)
    request.yar.set(
      'nooflocation',
      datasourceType === 'NON-AURN' ? nonAurnCount : aurnCount
    )
  } catch (error) {
    logger.error(`Station count re-calculation failed: ${errMsg(error)}`)
  }
}

async function handleDatasourcePost(request, h) {
  const datasourceType = request.payload?.['datasource-type'] || 'AURN'
  request.yar.set('selectedDatasourceType', datasourceType)
  await recalculateStationCount(request, datasourceType)
  return h.redirect('/customdataset')
}

// Resolve datasource groups from session, fetching as a fallback when empty.
// Returns { groups } normally, or { redirect } when the fetch fails.
async function resolveDatasourceGroups(request, h) {
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  if (datasourceGroups.length > 0) {
    return { groups: datasourceGroups }
  }

  const pollutantID = request.yar.get('selectedPollutantID')
  if (!pollutantID) {
    logger.warn('No selectedPollutantID in session — cannot fetch data sources')
    return { groups: datasourceGroups }
  }

  const flat = await fetchDatasourceForPollutant(pollutantID)
  if (flat === null) {
    return { redirect: h.redirect('/problem-with-service') }
  }

  const grouped = groupDatasources(flat)
  request.yar.set('datasourceGroups', grouped)
  return { groups: grouped }
}

async function handleDatasourceGet(request, h) {
  const backUrl = '/customdataset'

  const resolved = await resolveDatasourceGroups(request, h)
  if (resolved.redirect) {
    return resolved.redirect
  }

  const { enrichedGroups, otherGroups } = enrichGroupsAndBuildOther(
    resolved.groups
  )

  return h.view('datasource/index', {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: backUrl,
    datasourceGroups: enrichedGroups,
    otherGroups
  })
}

export const datasourceController = {
  handler: async (request, h) => {
    if (request.method === 'post') {
      return handleDatasourcePost(request, h)
    }
    return handleDatasourceGet(request, h)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
