import { config } from '~/src/config/config.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

async function invokeDownload(apiparams) {
  logger.info(`AURN download apiparams ${JSON.stringify(apiparams)}`)

  if (config.get('isDevelopment')) {
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
      if (payload?.error) return payload
      return { jobID: payload }
    } catch (error) {
      logger.error(
        `AURN download API error (local): ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return { error: true }
    }
  } else {
    try {
      const response = await axios.post(
        config.get('Download_aurn_URL'),
        apiparams
      )
      const idDownload = response.data
      if (idDownload?.error) return idDownload
      return { jobID: idDownload }
    } catch (error) {
      logger.error(
        `AURN download API error: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return { error: true }
    }
  }
}

async function invokeDownloadS3(downloadstatusapiparams) {
  let statusResponse

  if (config.get('isDevelopment')) {
    const url = config.get('pollingDevUrl')
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000))
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
        logger.error(
          `AURN polling API error (local): ${error instanceof Error ? error.message : 'unknown error'}`
        )
        throw error
      }
    } while (statusResponse.status !== 'Completed')
    return statusResponse.resultUrl
  } else {
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        const statusResult = await axios.post(
          config.get('Polling_URL'),
          downloadstatusapiparams
        )
        statusResponse = statusResult.data
      } catch (error) {
        logger.error(
          `AURN polling API error: ${error instanceof Error ? error.message : 'unknown error'}`
        )
        throw error
      }
    } while (statusResponse.status !== 'Completed')
    return statusResponse.resultUrl
  }
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year
      const dataSource = request.params.dataSource
      const isCountry = request.yar.get('Location') === 'Country'

      const apiparams = {
        pollutantName: request.yar.get('selectedPollutantID'),
        dataSource,
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
        return h.redirect(
          `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`
        )
      }

      if (request.url.pathname.includes('/download_aurn_nojs/')) {
        const downloadResultaurn = await invokeDownloadS3(
          downloadstatusapiparams
        )

        // Check for error from polling
        if (downloadResultaurn?.error) {
          return h.redirect(
            `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`
          )
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
      return h.redirect('/problem-with-service?statusCode=500')
    }
  }
}

export { downloadAurnController }
