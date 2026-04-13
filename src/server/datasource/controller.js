/**
 * Datasource controller — fetches available data sources for the selected
 * pollutant from the API and renders the datasource page.
 * @satisfies {Partial<ServerRoute>}
 */

import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const DATASOURCE_API_URL =
  'https://localhost:44352/AtomDataSelectionPollutantDataSource/'

// Known category headers returned by the API
const KNOWN_CATEGORIES = new Set([
  'Near real-time data from Defra',
  'Other data from Defra'
])

// POST pollutantID to the API, returns flat array of strings
async function fetchDatasourceForPollutant(pollutantID) {
  try {
    const { payload } = await Wreck.post(DATASOURCE_API_URL, {
      payload: JSON.stringify({ pollutantID: String(pollutantID) }),
      headers: { 'Content-Type': 'application/json' },
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
}

// Parse flat array ["Category", "Network", "Category", "Network", ...]
// into [{ category: "Category", networks: ["Network", ...] }, ...]
function groupDatasources(flat) {
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
    const backUrl = '/customdataset'
    const pollutantID = request.yar.get('selectedPollutantID')

    let datasourceGroups = []

    if (pollutantID) {
      const flat = await fetchDatasourceForPollutant(pollutantID)
      datasourceGroups = groupDatasources(flat)
    } else {
      logger.warn(
        'No selectedPollutantID in session — cannot fetch data sources'
      )
    }

    request.yar.set('datasourceGroups', datasourceGroups)

    return h.view('datasource/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: backUrl,
      datasourceGroups
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
