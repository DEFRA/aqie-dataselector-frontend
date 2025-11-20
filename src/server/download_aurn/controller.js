import { config } from '~/src/config/config.js'
import axios from 'axios'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
// import Wreck from '@hapi/wreck'

const logger = createLogger()
async function Invokedownload(apiparams) {
  // prod
  try {
    logger.info('apiparams', apiparams)
    logger.info('Download_aurn_URL', config.get('Download_aurn_URL'))
    const { payload } = await axios.post(
      config.get('Download_aurn_URL'),
      apiparams
    )
    logger.info('PayloadId', payload)
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
    //       'x-api-key': 'x3oRJxmyeyo1uSjRbNspYnveM096ZcyF',
    //       'Content-Type': 'application/json'
    //     },
    //     json: true
    //   })
    if (payload) {
      const idDownload = payload
      // console.log("payloadID",idDownload)
      const downloadstatusapiparams = { jobID: idDownload }
      //

      // Poll the status endpoint every 2 seconds until status is completed
      let statusResponse
      // const url1 =
      //   'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionJobStatus/'

      do {
        await new Promise((resolve) => setTimeout(resolve, 20000)) // Wait 20 seconds

        // const statusResult = await axios.post(url1, downloadstatusapiparams, {
        //   headers: {
        //     'x-api-key': 'x3oRJxmyeyo1uSjRbNspYnveM096ZcyF',
        //     'Content-Type': 'application/json'
        //   }
        // })
        const statusResult = await axios.post(
          config.get('Polling_URL'),
          downloadstatusapiparams
        )
        statusResponse = statusResult.data
        // console.log("Status response", statusResponse)
      } while (statusResponse.status !== 'Completed')
      logger.info('statusResponse.resultUrl', statusResponse.resultUrl)
      return statusResponse.resultUrl
    } else {
      logger.info('Error in JOBID:')
    }
  } catch (error) {
    logger.error('Error in Invokedownload:', error)
    throw new Error(`Download failed: ${error.message}`)
  }
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      const selectedyear = request.params.year

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

      // Only store serializable data in session
      if (typeof downloadResultaurn === 'string') {
        request.yar.set('downloadaurnresult', downloadResultaurn)
        return h.response(downloadResultaurn).type('text/plain').code(200)
      } else {
        throw new Error('Invalid download result format')
      }
    } catch (error) {
      logger.info('Error in downloadAurnController:', error.message)
      // Don't store error objects in session - they contain circular references
      request.yar.set('downloadaurnresult', null)
      return h
        .response({
          error: 'Download failed',
          message: error.message
        })
        .code(500)
    }
  }
}

export { downloadAurnController }
