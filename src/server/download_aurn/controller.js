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
      if (dataSource === 'NON-AURN') {
        // NON-AURN networks have a numeric `id` — match by it
        if (networkId && String(network.id) === String(networkId)) {
          return network.pollutantID || null
        }
      } else if (dataSource === 'AURN') {
        // AURN networks have no `id` field — take the first one found
        if (!network.id && network.pollutantID) {
          return network.pollutantID
        }
      }
    }
  }

  return null
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year
      const dataSource = request.params.dataSource
      const isCountry = request.yar.get('Location') === 'Country'
      const requestedNetworkId = (request.query?.networkId || '')
        .toString()
        .trim()
      const datasourceGroups = request.yar.get('datasourceGroups') || []
      const nonAurnNetworkId = getNonAurnNetworkIdCsv(datasourceGroups)

      // Use the pollutantID specific to the network that triggered the download.
      // Fall back to the globally selected pollutant ID if not found.
      const resolvedNetworkId =
        dataSource === 'NON-AURN' ? requestedNetworkId || nonAurnNetworkId : ''
      const networkPollutantID = getPollutantIDForNetwork(
        datasourceGroups,
        dataSource,
        resolvedNetworkId
      )
      const pollutantName =
        networkPollutantID || request.yar.get('selectedPollutantID')

      const apiparams = {
        pollutantName,
        dataSource,
        networkId:
          dataSource === 'NON-AURN'
            ? requestedNetworkId || nonAurnNetworkId
            : '',
        Region: isCountry
          ? request.yar.get('selectedlocation').join(',')
          : request.yar.get('selectedLAIDs'),
        regiontype: request.yar.get('Location'),
        Year: selectedyear,
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorSingle'
      }

      const downloadstatusapiparams = await invokeDownload(apiparams)

      if (downloadstatusapiparams?.error) {
        return h.redirect(PROBLEM_WITH_SERVICE)
      }

      if (request.url.pathname.includes('/download_aurn_nojs/')) {
        const downloadResultaurn = await invokeDownloadS3(
          downloadstatusapiparams
        )

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
