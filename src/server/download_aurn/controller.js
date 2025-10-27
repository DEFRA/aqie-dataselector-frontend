import { config } from '~/src/config/config.js'
import axios from 'axios'
// import Wreck from '@hapi/wreck'
async function Invokedownload(apiparams) {
  // prod
  try {
    const response = await axios.post(
      config.get('Download_aurn_URL'),
      apiparams
    )
    // logger.info(`response data ${JSON.stringify(response.data)}`)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }

  // dev
  // try {
  //       const url = 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
  //      const { res, payload } = await Wreck.post(url, {
  //         payload: JSON.stringify(apiparams),
  //          headers: {
  //     'x-api-key': 'IRBHPcj245YHRuOcTAw5A2r31mZA9SfE',
  //     'Content-Type': 'application/json'
  //   },
  //   json: true
  // })
  // console.log("PAYLOAD", payload)
  // return payload
  //     } catch (error) {
  //       return error // Rethrow the error so it can be handled appropriately
  //     }
}

const downloadAurnController = {
  handler: async (request, h) => {
    try {
      // const stndetails = request.yar.get('stationdetails')
      // Declare apiparams only once here
      const apiparams = {
        pollutantName: request.yar.get('selectedpollutant'),
        dataSource: 'AURN',
        Region: 'England',
        Year: '2022',
        dataselectorfiltertype: 'dataSelectorHourly'
      }
      const downloadResultaurn = await Invokedownload(apiparams)

      request.yar.set('downloadaurnresult', downloadResultaurn)
      // const viewData = request.yar.get('viewData')
      // const viewData = {
      //   ...request.yar.get('viewData'),
      //   downloadaurnresult
      // }

      // const url1 = 'https://url'aqie-dataselector-frontend\src\server\stationDetailsNojs\index.njk

      return h.response(downloadResultaurn).type('application/json').code(200)
    } catch (error) {
      // console.error('Error rendering partial content:', error)
      // return h.response('Error rendering partial content').code(500);
    }
  }
}

export { downloadAurnController }
