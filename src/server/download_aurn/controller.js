import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
// import Wreck from '@hapi/wreck'
const logger = createLogger()
async function Invokedownload(apiparams) {
  // prod
  logger.info(`apiparams ${JSON.stringify(apiparams)}`)
  try {
    const response = await axios.post(
      config.get('Download_aurn_URL'),
      apiparams
    )
    const idDownload = response.data
    const downloadstatusapiparams = { jobID: idDownload }
    return downloadstatusapiparams
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}
async function invokedownloadS3(downloadstatusapiparams) {
  // Poll the status endpoint every 2 seconds until status is completed
  let statusResponse

  try {
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
      const statusResult = await axios.post(
        config.get('Polling_URL'),
        downloadstatusapiparams
      )
      statusResponse = statusResult.data
    } while (statusResponse.status !== 'Completed')
    return statusResponse.resultUrl
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}
// dev
// async function Invokedownload(apiparams) { // prod

//     try {
//       const url =
//         'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
//       const { payload } = await Wreck.post(url, {
//         payload: JSON.stringify(apiparams),
//         headers: {
//           'x-api-key': 'T08yvqWwVS6df56ELMuQ2GPrwp3e7uaT',
//           'Content-Type': 'application/json'
//         },
//         json: true
//       })
//       console.log('payload', payload)

//  const idDownload = payload
//     const downloadstatusapiparams = { jobID: idDownload }

//     return downloadstatusapiparams
//   } catch (error) {
//     return error // Rethrow the error so it can be handled appropriately
//   }
// }
// dev
// async function invokedownloadS3(downloadstatusapiparams) {
//   // Poll the status endpoint every 2 seconds until status is completed
//   let statusResponse
//   const url1 =
//     'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionJobStatus/'
//   try {
//     do {
//       await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second

//       const statusResult = await axios.post(url1, downloadstatusapiparams, {
//         headers: {
//           'x-api-key': 'T08yvqWwVS6df56ELMuQ2GPrwp3e7uaT',
//           'Content-Type': 'application/json'
//         }
//       })
//       statusResponse = statusResult.data

//     } while (statusResponse.status !== 'Completed')

//     return statusResponse.resultUrl
//   } catch (error) {
//     return error // Rethrow the error so it can be handled appropriately
//   }
// }

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year
      // console.log('Comes into download_Aurn', selectedyear)
      // const stndetails = request.yar.get('stationdetails')
      // Declare apiparams only once here
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
      const downloadstatusapiparams = await Invokedownload(apiparams)

      // Check for error
      if (downloadstatusapiparams?.error) {
        return h.redirect(
          `/problem-with-service?statusCode=${downloadstatusapiparams.statusCode || 500}`
        )
      }

      // For no-JS route, do server-side polling (existing functionality)
      if (request.url.pathname.includes('/download_aurn_nojs/')) {
        const downloadResultaurn = await invokedownloadS3(
          downloadstatusapiparams
        )

        // Check for error from polling
        if (downloadResultaurn?.error) {
          return h.redirect(
            `/problem-with-service?statusCode=${downloadResultaurn.statusCode || 500}`
          )
        }

        const viewData = {
          ...request.yar.get('viewDatanojs'),
          downloadresultnojs: downloadResultaurn
        }
        request.yar.set('downloadaurnresult', downloadResultaurn)
        return h.view('download_dataselector_nojs/index', viewData)
      }

      // For JS route, return jobID immediately (client will poll)
      return h
        .response(downloadstatusapiparams)
        .type('application/json')
        .code(200)
    } catch (error) {
      return h.response({ error: 'An error occurred' }).code(500)
    }
  }
}

export { downloadAurnController }
