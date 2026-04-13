import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

async function invokeUKEAPDownload(apiparams) {
  logger.info(`UKEAP download apiparams ${JSON.stringify(apiparams)}`)
  const response = await axios.post(config.get('Download_aurn_URL'), apiparams)
  const idDownload = response.data

  if (idDownload?.error) {
    return idDownload
  }

  return { jobID: idDownload }
}

async function invokeUKEAPDownloadS3(downloadstatusapiparams) {
  let statusResponse

  do {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const statusResult = await axios.post(
      config.get('Polling_URL'),
      downloadstatusapiparams
    )
    statusResponse = statusResult.data
  } while (statusResponse.status !== 'Completed')

  return statusResponse.resultUrl
}

const downloadUkeapController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year
      const isCountry = request.yar.get('Location') === 'Country'

      const apiparams = {
        pollutantName: 'Nitrogen dioxide',
        dataSource: 'UKEAP',
        Region: isCountry
          ? request.yar.get('selectedlocation').join(',')
          : request.yar.get('selectedLAIDs'),
        regiontype: request.yar.get('Location'),
        Year: selectedyear,
        dataselectorfiltertype: 'dataSelectorMonthly',
        dataselectordownloadtype: 'dataSelectorSingle'
      }

      const downloadstatusapiparams = await invokeUKEAPDownload(apiparams)

      if (downloadstatusapiparams?.error) {
        return h.redirect(
          `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`
        )
      }

      if (request.url.pathname.includes('/download_ukeap_nojs/')) {
        const downloadResult = await invokeUKEAPDownloadS3(
          downloadstatusapiparams
        )

        if (downloadResult?.error) {
          return h.redirect(
            `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`
          )
        }

        const viewData = {
          ...request.yar.get('viewDatanojs'),
          downloadresultnojs: downloadResult
        }
        request.yar.set('downloadukeapresult', downloadResult)
        return h.view('download_dataselector_nojs/index', viewData)
      }

      return h
        .response(downloadstatusapiparams)
        .type('application/json')
        .code(HTTP_OK)
    } catch (error) {
      logger.error(`Download UKEAP handler error: ${error.message}`)
      return h.redirect('/problem-with-service?statusCode=500')
    }
  }
}

export { downloadUkeapController }
