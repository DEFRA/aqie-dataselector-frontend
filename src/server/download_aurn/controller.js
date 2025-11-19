import { config } from '~/src/config/config.js'
import axios from 'axios'
// import Wreck from '@hapi/wreck'
async function Invokedownload(apiparams) {
  // prod
  // try {
  //   const response = await axios.post(
  //     config.get('Download_aurn_URL'),
  //     apiparams
  //   )
  // logger.info(`response data ${JSON.stringify(response.data)}`)
  //   return response.data
  // } catch (error) {
  //   return error // Rethrow the error so it can be handled appropriately
  // }

  // dev
  try {
    // const url =
    //   'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
    // const { payload } = await Wreck.post(url, {
    //   payload: JSON.stringify(apiparams),
    //   headers: {
    //     'x-api-key': 'lJy5Q8p5ObarFi4uitd28fFW4tKz8DdG',
    //     'Content-Type': 'application/json'
    //   },
    //   json: true
    // })

    const payload = await axios.post(config.get('Download_aurn_URL'), apiparams)

    const idDownload = payload
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
      //     'x-api-key': 'lJy5Q8p5ObarFi4uitd28fFW4tKz8DdG',
      //     'Content-Type': 'application/json'
      //   }
      // })
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
