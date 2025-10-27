/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
// import Wreck from '@hapi/wreck'
export const customdatasetController = {
  handler: async (request, h) => {
    // const { home } = englishNew.custom
    request.yar.set('searchQuery', null)
    request.yar.set('fullSearchQuery', null)
    request.yar.set('searchLocation', '')
    request.yar.set('osnameapiresult', '')
    request.yar.set('selectedLocation', '')
    request.yar.set('nooflocation', '')
    request.yar.set('yearselected', '2024')
    request.yar.set('selectedYear', '2025')
    if (request.params.pollutants !== undefined) {
      request.yar.set('selectedpollutant', request.params.pollutants)
    }

    if (request.path?.includes('/year')) {
      request.yar.set('selectedyear', request.params.year)
    }
    // if (request.path && request.path.includes('/location')) {
    //   console.log("URL contains /location:", request.params.locations);
    //   request.yar.set('selectedlocation', request.params.locations)
    // }
    if (request.path?.includes('/location')) {
      let selectedCountry = request.payload.country
      if (selectedCountry && !Array.isArray(selectedCountry)) {
        selectedCountry = [selectedCountry]
      }
      // const selectedCountry = request.payload.country;

      request.yar.set('selectedlocation', selectedCountry)
    }

    if (
      request.yar.get('selectedlocation') &&
      request.yar.get('selectedyear') &&
      request.yar.get('selectedpollutant')
    ) {
      const stationcountparameters = {
        pollutantName: request.yar.get('selectedpollutant'),
        dataSource: 'AURN',
        Region: 'England',
        Year: '2022',
        dataselectorfiltertype: 'dataSelectorCount'
      }

      const stationcount = await Invokestationcount(stationcountparameters)

      request.yar.set('nooflocation', stationcount)
    }
    async function Invokestationcount(stationcountparameters) {
      // prod
      try {
        const response = await axios.post(
          config.get('Download_aurn_URL'),
          stationcountparameters
        )
        // logger.info(`response data ${JSON.stringify(response.data)}`)
        return response.data
      } catch (error) {
        return error // Rethrow the error so it can be handled appropriately
      }

      // dev
      // try {
      //       const url = 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
      //       const { res, payload } = await Wreck.post(url, {
      //         payload: JSON.stringify(stationcountparameters),
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

    return h.view('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      selectedpollutant: request.yar.get('selectedpollutant'),
      selectedyear: request.yar.get('selectedyear'),
      selectedlocation: request.yar.get('selectedlocation'),
      stationcount: request.yar.get('nooflocation')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
