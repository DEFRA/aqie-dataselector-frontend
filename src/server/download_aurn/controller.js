import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'
// import Wreck from '@hapi/wreck' // NOSONAR
const logger = createLogger()
async function invokeDownload(apiparams) {
  // prod
  logger.info(`apiparams ${JSON.stringify(apiparams)}`)
  const response = await axios.post(config.get('Download_aurn_URL'), apiparams)
  const idDownload = response.data

  // If the response is an error object, return it directly
  if (idDownload?.error) {
    return idDownload
  }

  const downloadstatusapiparams = { jobID: idDownload }
  return downloadstatusapiparams
}
async function invokeDownloadS3(downloadstatusapiparams) {
  // Poll the status endpoint every 2 seconds until status is completed
  let statusResponse

  do {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
    const statusResult = await axios.post(
      config.get('Polling_URL'),
      downloadstatusapiparams
    )
    statusResponse = statusResult.data
  } while (statusResponse.status !== 'Completed')
  return statusResponse.resultUrl
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year

      let apiparams
      if (request.yar.get('Location') === 'Country') {
        apiparams = {
          pollutantName: request.yar.get('formattedPollutants'),
          dataSource: 'AURN',
          Region: request.yar.get('selectedlocation').join(','),
          regiontype: request.yar.get('Location'),
          Year: selectedyear,
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle'
        }
      } else {
        apiparams = {
          pollutantName: request.yar.get('formattedPollutants'),
          dataSource: 'AURN',
          Region: request.yar.get('selectedLAIDs'),
          regiontype: request.yar.get('Location'),
          Year: selectedyear,
          dataselectorfiltertype: 'dataSelectorHourly',
          dataselectordownloadtype: 'dataSelectorSingle'
        }
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
