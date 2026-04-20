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

const logger = createLogger()

// Build lowercase name/fullName → network entry lookup
const networkLookup = new Map()
for (const entry of Object.values(networkData)) {
  if (entry.name) networkLookup.set(entry.name.toLowerCase().trim(), entry)
  if (entry.fullName)
    networkLookup.set(entry.fullName.toLowerCase().trim(), entry)
}

function lookupNetwork(name) {
  return networkLookup.get((name || '').toLowerCase().trim()) || null
}

// Enrich raw string groups with full metadata; also build "other" groups
function enrichGroupsAndBuildOther(rawGroups) {
  const usedAbbreviations = new Set()

  const enrichedGroups = rawGroups.map((group) => ({
    category: group.category,
    networks: group.networks.map((name) => {
      const meta = lookupNetwork(name)
      if (meta) usedAbbreviations.add(meta.abbreviation)
      return meta || { name, fullName: name }
    })
  }))

  const otherByCategory = {}
  for (const entry of Object.values(networkData)) {
    if (!usedAbbreviations.has(entry.abbreviation)) {
      if (!otherByCategory[entry.category]) otherByCategory[entry.category] = []
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

// POST pollutantID to the API, returns flat array of strings
export async function fetchDatasourceForPollutant(pollutantID) {
  const body = { pollutantID: String(pollutantID) }
  if (config.get('isDevelopment')) {
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
        `Datasource API call failed for pollutantID ${pollutantID}: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return []
    }
  } else {
    try {
      const response = await axios.post(config.get('datasourceApiUrl'), body)
      const result = Array.isArray(response.data) ? response.data : []
      logger.info(
        `Datasource API returned ${result.length} items for pollutantID ${pollutantID}`
      )
      return result
    } catch (error) {
      logger.error(
        `Datasource API call failed for pollutantID ${pollutantID}: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return []
    }
  }
}

// Parse flat array ["Category", "Network", "Category", "Network", ...]
// into [{ category: "Category", networks: ["Network", ...] }, ...]
export function groupDatasources(flat) {
  const groups = []
  let currentGroup = null

  for (const item of flat) {
    if (KNOWN_CATEGORIES.has(item)) {
      currentGroup = { category: item, networks: [] }
      groups.push(currentGroup)
    } else if (currentGroup) {
      currentGroup.networks.push(item)
    }
  }

  return groups
}

export const datasourceController = {
  handler: async (request, h) => {
    if (request.method === 'post') {
      const datasourceType = request.payload?.['datasource-type'] || 'AURN'
      request.yar.set('selectedDatasourceType', datasourceType)

      // Re-trigger station count with the new datasource type if all required data is in session
      const finalyear = request.yar.get('finalyear1')
      const pollutantID = request.yar.get('selectedPollutantID')
      const selectedlocation = request.yar.get('selectedlocation')
      const selectedLAIDs = request.yar.get('selectedLAIDs')
      const isCountry = request.yar.get('Location') === 'Country'

      if (finalyear && pollutantID && selectedlocation) {
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
            invokeStationCount({ ...baseParams, dataSource: 'AURN' }),
            invokeStationCount({ ...baseParams, dataSource: 'NON-AURN' })
          ])
          request.yar.set('stationCountAURN', aurnCount)
          request.yar.set('stationCountNONAURN', nonAurnCount)
          request.yar.set('nooflocationukeap', nonAurnCount)
          request.yar.set(
            'nooflocation',
            datasourceType === 'NON-AURN' ? nonAurnCount : aurnCount
          )
        } catch (error) {
          logger.error(
            `Station count re-calculation failed: ${error instanceof Error ? error.message : 'unknown error'}`
          )
        }
      }

      return h.redirect('/customdataset')
    }

    const backUrl = '/customdataset'

    // datasourceGroups is pre-fetched and stored in session by add_pollutant POST
    let datasourceGroups = request.yar.get('datasourceGroups') || []

    // Fallback: fetch if session is empty (e.g. direct navigation)
    if (datasourceGroups.length === 0) {
      const pollutantID = request.yar.get('selectedPollutantID')
      if (pollutantID) {
        const flat = await fetchDatasourceForPollutant(pollutantID)
        datasourceGroups = groupDatasources(flat)
        request.yar.set('datasourceGroups', datasourceGroups)
      } else {
        logger.warn(
          'No selectedPollutantID in session — cannot fetch data sources'
        )
      }
    }

    const { enrichedGroups, otherGroups } =
      enrichGroupsAndBuildOther(datasourceGroups)

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
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
