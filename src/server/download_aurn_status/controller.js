import { config } from '~/src/config/config.js'
import axios from 'axios'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const PROBLEM_SERVICE_500_URL = `/problem-with-service?statusCode=${HTTP_INTERNAL_SERVER_ERROR}`

async function invokeDownloadS3(downloadstatusapiparams) {
  // Single status check - no polling loop!

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
    // Return structured error
    if (error.response) {
      return {
        error: true,
        statusCode: error.response.status,
        redirectUrl: `/problem-with-service?statusCode=${error.response.status}`
      }
    } else if (error.request) {
      return {
        error: true,
        statusCode: statusCodes.internalServerError,
        redirectUrl: PROBLEM_SERVICE_500_URL
      }
    } else {
      return {
        error: true,
        statusCode: statusCodes.internalServerError,
        redirectUrl: PROBLEM_SERVICE_500_URL
      }
    }
  }
}

const downloadAurnstatusController = {
  handler: async (request, h) => {
    try {
      const jobID = request.params.jobID
      // logger.info(`Status check requested for jobID: ${jobID}`)

      if (!jobID) {
        return h
          .response({
            error: true,
            message: 'Job ID is required'
          })
          .code(HTTP_BAD_REQUEST)
      }

      // Check status once (no loop!)

      const downloadstatusapiparams = { jobID }

      const statusData = await invokeDownloadS3(downloadstatusapiparams)

      // Check for error
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

      // If completed, save to session
      if (statusData.status === 'Completed' && statusData.resultUrl) {
        request.yar.set('downloadaurnresult', statusData.resultUrl)
      }

      // Get viewData from session and include in response
      const viewData = request.yar.get('viewDatanojs')

      // Return status with viewData
      return h
        .response({
          ...statusData,
          viewData: viewData || null
        })
        .type('application/json')
        .code(HTTP_OK)
    } catch (error) {
      // logger.error('Error in status handler:', error)
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

export { downloadAurnstatusController }
