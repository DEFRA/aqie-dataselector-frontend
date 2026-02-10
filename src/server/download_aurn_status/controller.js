import { config } from '~/src/config/config.js'
import axios from 'axios'

async function invokedownloadS3(downloadstatusapiparams) {
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
        statusCode: 500,
        redirectUrl: '/problem-with-service?statusCode=500'
      }
    } else {
      return {
        error: true,
        statusCode: 500,
        redirectUrl: '/problem-with-service?statusCode=500'
      }
    }
  }
}
// dev
// async function invokedownloadS3(downloadstatusapiparams) {
//   // Single status check - no polling loop!
//   const url1 =
//     'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionJobStatus/'
//   try {
//     // logger.info(`Checking status for jobID: ${downloadstatusapiparams}`)

//     const statusResult = await axios.post(url1, downloadstatusapiparams, {
//       headers: {
//         'x-api-key': 'T08yvqWwVS6df56ELMuQ2GPrwp3e7uaT',
//         'Content-Type': 'application/json'
//       }
//     })

//     const statusResponse = statusResult.data

//     // Return status and resultUrl
//     return {
//       status: statusResponse.status,
//       resultUrl: statusResponse.resultUrl || null
//     }
//   } catch (error) {

//     // Return structured error
//     if (error.response) {
//       return {
//         error: true,
//         statusCode: error.response.status,
//         redirectUrl: `/problem-with-service?statusCode=${error.response.status}`
//       }
//     } else if (error.request) {
//       return {
//         error: true,
//         statusCode: 500,
//         redirectUrl: '/problem-with-service?statusCode=500'
//       }
//     } else {
//       return {
//         error: true,
//         statusCode: 500,
//         redirectUrl: '/problem-with-service?statusCode=500'
//       }
//     }
//   }
// }

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
          .code(400)
      }

      // Check status once (no loop!)

      const downloadstatusapiparams = { jobID }

      const statusData = await invokedownloadS3(downloadstatusapiparams)

      // Check for error
      if (statusData?.error) {
        return h
          .response({
            error: true,
            statusCode: statusData.statusCode,
            redirectUrl:
              statusData.redirectUrl ||
              `/problem-with-service?statusCode=${statusData.statusCode || 500}`,
            message: 'Status check failed'
          })
          .type('application/json')
          .code(200)
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
        .code(200)
    } catch (error) {
      // logger.error('Error in status handler:', error)
      return h
        .response({
          error: true,
          statusCode: 500,
          redirectUrl: '/problem-with-service?statusCode=500',
          message: 'An error occurred'
        })
        .type('application/json')
        .code(200)
    }
  }
}

export { downloadAurnstatusController }
