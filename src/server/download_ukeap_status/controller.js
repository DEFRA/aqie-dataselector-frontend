import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

const PROBLEM_SERVICE_500_URL = `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`

function createServerErrorResponse() {
  return {
    error: true,
    statusCode: statusCodes.internalServerError,
    redirectUrl: PROBLEM_SERVICE_500_URL
  }
}

async function invokeUKEAPDownloadS3(downloadstatusapiparams) {
  try {
    const statusResult = await axios.post(
      config.get('Polling_URL'),
      downloadstatusapiparams
    )
    const statusResponse = statusResult.data

    return {
      status: statusResponse.status,
      resultUrl: statusResponse.resultUrl || null
    }
  } catch (error) {
    if (error.response) {
      return {
        error: true,
        statusCode: error.response.status,
        redirectUrl: `/problem-with-service?statusCode=${error.response.status}`
      }
    } else {
      return createServerErrorResponse()
    }
  }
}

const downloadUkeapstatusController = {
  handler: async (request, h) => {
    try {
      const jobID = request.params.jobID

      if (!jobID) {
        return h
          .response({ error: true, message: 'Job ID is required' })
          .code(HTTP_BAD_REQUEST)
      }

      const statusData = await invokeUKEAPDownloadS3({ jobID })

      if (statusData?.error) {
        return h
          .response({
            error: true,
            statusCode: statusData.statusCode,
            redirectUrl:
              statusData.redirectUrl ||
              `/problem-with-service?statusCode=${statusData.statusCode || HTTP_INTERNAL_SERVER_ERROR}`,
            message: 'Status check failed'
          })
          .type('application/json')
          .code(HTTP_OK)
      }

      if (statusData.status === 'Completed' && statusData.resultUrl) {
        request.yar.set('downloadukeapresult', statusData.resultUrl)
      }

      const viewData = request.yar.get('viewDatanojs')

      return h
        .response({ ...statusData, viewData: viewData || null })
        .type('application/json')
        .code(HTTP_OK)
    } catch (error) {
      logger.error(`Download UKEAP status handler error: ${error.message}`)
      return h
        .response({
          error: true,
          statusCode: HTTP_INTERNAL_SERVER_ERROR,
          redirectUrl: PROBLEM_SERVICE_500_URL,
          message: 'An error occurred'
        })
        .type('application/json')
        .code(HTTP_OK)
    }
  }
}

export { downloadUkeapstatusController }
