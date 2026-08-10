import { config } from '~/src/config/config.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { HTTP_OK } from '~/src/server/common/constants/magic-numbers.js'
import { getNonAurnNetworkIdCsv } from '~/src/server/common/helpers/network-helpers.js'

const logger = createLogger()

const PROBLEM_WITH_SERVICE = '/problem-with-service'
const POLL_INTERVAL_MS = 1000

// Extract a human-readable message from a thrown value.
const errMsg = (error) =>
  error instanceof Error ? error.message : 'unknown error'

async function invokeDownloadDev(apiparams) {
  try {
    const url = config.get('downloadAurnDevUrl')
    const { payload } = await Wreck.post(url, {
      payload: JSON.stringify(apiparams),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.get('osNamesDevApiKey')
      },
      json: true
    })
    if (payload?.error) {
      return payload
    }
    return { jobID: payload }
  } catch (error) {
    logger.error(`AURN download API error (local): ${errMsg(error)}`)
    return { error: true }
  }
}

async function invokeDownloadProd(apiparams) {
  try {
    const response = await axios.post(
      config.get('Download_aurn_URL'),
      apiparams
    )
    const idDownload = response.data
    if (idDownload?.error) {
      return idDownload
    }
    return { jobID: idDownload }
  } catch (error) {
    logger.error(`AURN download API error: ${errMsg(error)}`)
    return { error: true }
  }
}

async function invokeDownload(apiparams) {
  logger.info(`AURN download apiparams ${JSON.stringify(apiparams)}`)
  return config.get('isDevelopment')
    ? invokeDownloadDev(apiparams)
    : invokeDownloadProd(apiparams)
}

async function pollDownloadStatusDev(downloadstatusapiparams) {
  const url = config.get('pollingDevUrl')
  let statusResponse
  do {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    try {
      const { payload } = await Wreck.post(url, {
        payload: JSON.stringify(downloadstatusapiparams),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      statusResponse = payload
    } catch (error) {
      logger.error(`AURN polling API error (local): ${errMsg(error)}`)
      throw error
    }
  } while (statusResponse.status !== 'Completed')
  return statusResponse.resultUrl
}

async function pollDownloadStatusProd(downloadstatusapiparams) {
  let statusResponse
  do {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    try {
      const statusResult = await axios.post(
        config.get('Polling_URL'),
        downloadstatusapiparams
      )
      statusResponse = statusResult.data
    } catch (error) {
      logger.error(`AURN polling API error: ${errMsg(error)}`)
      throw error
    }
  } while (statusResponse.status !== 'Completed')
  return statusResponse.resultUrl
}

async function invokeDownloadS3(downloadstatusapiparams) {
  return config.get('isDevelopment')
    ? pollDownloadStatusDev(downloadstatusapiparams)
    : pollDownloadStatusProd(downloadstatusapiparams)
}

/**
 * Decides whether a single network is the one the download was triggered for.
 * @param {object} network          - a network entry from a datasource group
 * @param {string} dataSource       - 'AURN' | 'NON-AURN'
 * @param {string} networkId        - the resolved networkId (may be '')
 * @returns {boolean}
 */
function isMatchingNetwork(network, dataSource, networkId) {
  if (dataSource === 'NON-AURN') {
    // NON-AURN networks have a numeric `id` — match by it
    return Boolean(networkId) && String(network.id) === String(networkId)
  }

  // AURN networks have no `id` field — take the first one found
  return dataSource === 'AURN' && !network.id && Boolean(network.pollutantID)
}

/**
 * Resolves the correct pollutantID for the network that triggered the download.
 *
 * - For AURN (no networkId): finds the first network without an `id` field in
 * the "Near real-time data from Defra" category and returns its pollutantID.
 * - For NON-AURN: matches by numeric network `id` and returns its pollutantID.
 * - Falls back to null so callers can use selectedPollutantID instead.
 * @param {Array} datasourceGroups  - raw groups stored in session
 * @param {string} dataSource       - 'AURN' | 'NON-AURN'
 * @param {string} networkId        - the networkId from the query string (may be '')
 * @returns {string|null}
 */
function getPollutantIDForNetwork(datasourceGroups, dataSource, networkId) {
  if (!Array.isArray(datasourceGroups) || datasourceGroups.length === 0) {
    return null
  }

  for (const group of datasourceGroups) {
    for (const network of group.networks || []) {
      if (isMatchingNetwork(network, dataSource, networkId)) {
        return network.pollutantID || null
      }
    }
  }

  return null
}

/**
 * The networkId sent to the API — only NON-AURN downloads are network-scoped.
 * Prefers the id from the query string, falling back to the session CSV.
 * @param {string} dataSource         - 'AURN' | 'NON-AURN'
 * @param {string} requestedNetworkId - networkId from the query string
 * @param {string} nonAurnNetworkId   - CSV of NON-AURN ids from session
 * @returns {string}
 */
function resolveNetworkId(dataSource, requestedNetworkId, nonAurnNetworkId) {
  if (dataSource !== 'NON-AURN') {
    return ''
  }
  return requestedNetworkId || nonAurnNetworkId
}

/**
 * Country downloads are keyed by location names, everything else by LA ids.
 * @param {object} request - the Hapi request
 * @returns {string}
 */
function resolveRegion(request) {
  if (request.yar.get('Location') === 'Country') {
    return request.yar.get('selectedlocation').join(',')
  }
  return request.yar.get('selectedLAIDs')
}

/**
 * Builds the download API request body from the route params and session.
 * @param {object} request      - the Hapi request
 * @param {string} dataSource   - 'AURN' | 'NON-AURN'
 * @param {string} selectedyear - the year from the route params
 * @returns {object}
 */
function buildApiParams(request, dataSource, selectedyear) {
  const requestedNetworkId = (request.query?.networkId || '').toString().trim()
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const nonAurnNetworkId = getNonAurnNetworkIdCsv(datasourceGroups)
  const networkId = resolveNetworkId(
    dataSource,
    requestedNetworkId,
    nonAurnNetworkId
  )

  // Use the pollutantID specific to the network that triggered the download.
  // Fall back to the globally selected pollutant ID if not found.
  const networkPollutantID = getPollutantIDForNetwork(
    datasourceGroups,
    dataSource,
    networkId
  )

  return {
    pollutantName: networkPollutantID || request.yar.get('selectedPollutantID'),
    dataSource,
    networkId,
    Region: resolveRegion(request),
    regiontype: request.yar.get('Location'),
    Year: selectedyear,
    dataselectorfiltertype: 'dataSelectorHourly',
    dataselectordownloadtype: 'dataSelectorSingle'
  }
}

/**
 * No-JS route: polls for the download to finish, then renders the result page.
 * @param {object} request                 - the Hapi request
 * @param {object} h                       - the Hapi response toolkit
 * @param {object} downloadstatusapiparams - the job details from invokeDownload
 * @returns {Promise<object>}
 */
async function renderNoJsDownload(request, h, downloadstatusapiparams) {
  const downloadResultaurn = await invokeDownloadS3(downloadstatusapiparams)

  // Check for error from polling
  if (downloadResultaurn?.error) {
    return h.redirect(PROBLEM_WITH_SERVICE)
  }

  const viewData = {
    ...request.yar.get('viewDatanojs'),
    downloadresultnojs: downloadResultaurn
  }
  request.yar.set('downloadaurnresult', downloadResultaurn)
  return h.view('download_dataselector_nojs/index', viewData)
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const apiparams = buildApiParams(
        request,
        request.params.dataSource,
        request.params.year
      )

      const downloadstatusapiparams = await invokeDownload(apiparams)

      if (downloadstatusapiparams?.error) {
        return h.redirect(PROBLEM_WITH_SERVICE)
      }

      if (request.url.pathname.includes('/download_aurn_nojs/')) {
        // Awaited (not just returned) so polling failures hit the catch below.
        return await renderNoJsDownload(request, h, downloadstatusapiparams)
      }

      return h
        .response(downloadstatusapiparams)
        .type('application/json')
        .code(HTTP_OK)
    } catch (error) {
      logger.error(`Download AURN handler error: ${error.message}`)
      return h.redirect(PROBLEM_WITH_SERVICE)
    }
  }
}

export { downloadAurnController }
