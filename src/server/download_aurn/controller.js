import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
const logger = createLogger()

// import Wreck from '@hapi/wreck'
async function Invokedownload(apiparams) {
  // prod
  logger.info(`apiparams ${JSON.stringify(apiparams)}`)
  try {
    const response = await axios.post(
      config.get('Download_aurn_URL'),
      apiparams
    )
    logger.info(`response data new one ${JSON.stringify(response.data)}`)
    //  logger.info(`response  ${JSON.stringify(response)}`)
    //   return response.data
    // } catch (error) {
    //   return error // Rethrow the error so it can be handled appropriately
    // }

    // dev
    // try {
    //   const url =
    //     'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
    //   const { payload } = await Wreck.post(url, {
    //     payload: JSON.stringify(apiparams),
    //     headers: {
    //       'x-api-key': 't15WKmUhFiwRNH6LSkJ0Oe4FubJ7bPxW',
    //       'Content-Type': 'application/json'
    //     },
    //     json: true
    //   })
    // console.log("payload",response)
    // logger.info("PayloadID",payload)
    // logger.info("PayloadID",Json.stringify(payload))
    logger.info('idDownload entering')
    const idDownload = response.data
    logger.info('idDownload received')
    const downloadstatusapiparams = { jobID: idDownload }
    logger.info('idDownload', idDownload)
    logger.info('downloadstatusapiparams', downloadstatusapiparams)
    logger.info(`idDownloadstring ${JSON.stringify(idDownload)}`)
    logger.info(
      `downloadstatusapiparamsstring  ${JSON.stringify(downloadstatusapiparams)}`
    )
    //

    // Poll the status endpoint every 2 seconds until status is completed
    let statusResponse
    // const url1 =
    //   'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionJobStatus/'

    do {
      await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 20 seconds

      // const statusResult = await axios.post(url1, downloadstatusapiparams, {
      //   headers: {
      //     'x-api-key': 't15WKmUhFiwRNH6LSkJ0Oe4FubJ7bPxW',
      //     'Content-Type': 'application/json'
      //   }
      // })
      const statusResult = await axios.post(
        config.get('Polling_URL'),
        downloadstatusapiparams
      )
      statusResponse = statusResult.data
    } while (statusResponse.status !== 'Completed')
    //  return response
    logger.info('statusResponse.resultUrl', statusResponse.resultUrl)
    logger.info(
      `statusResponse.resultUrlstring ${JSON.stringify(statusResponse.resultUrl)}`
    )
    return statusResponse.resultUrl
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year
      // const stndetails = request.yar.get('stationdetails')
      // Declare apiparams only once here
      const apiparams = {
        pollutantName: request.yar.get('formattedPollutants'),
        dataSource: 'AURN',
        Region: request.yar.get('selectedlocation').join(','),
        Year: selectedyear,
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorSingle'
      }
      const downloadResultaurn = await Invokedownload(apiparams)

      request.yar.set('downloadaurnresult', downloadResultaurn)

      return h.response(downloadResultaurn).type('application/json').code(200)
    } catch (error) {
      return h.response({ error: 'An error occurred' }).code(500)
    }
  }
}

export { downloadAurnController }
