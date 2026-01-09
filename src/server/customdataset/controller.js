/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
// import { error } from 'node:console'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
// import Wreck from '@hapi/wreck'
export const customdatasetController = {
  handler: async (request, h) => {
    const backUrl = '/hubpage'
    // const { hoe } = englishNew.custom
    if (request.path?.includes('/clear')) {
      // Clear all selected options and pollutants
      request.yar.set('selectedpollutant', '')
      request.yar.set('selectedyear', '')
      request.yar.set('selectedlocation', '')
      request.yar.set('nooflocation', '')

      // Clear pollutant-specific session variables
      request.yar.set('selectedPollutants', null)
      request.yar.set('selectedPollutantMode', '')
      request.yar.set('selectedPollutantGroup', '')
      request.yar.set('formattedPollutants', '')

      // Clear other related session variables including time period
      request.yar.set('selectedTimePeriod', null)
      request.yar.set('yearrange', '')
      request.yar.set('finalyear', '')
      request.yar.set('finalyear1', '')
      request.yar.set('Region', '')
      request.yar.set('selectedLAIDs', '')
      request.yar.set('Location', '')

      return h.view('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: request.yar.get('selectedpollutant'),
        selectedyear: request.yar.get('selectedyear'),
        selectedlocation: request.yar.get('selectedlocation'),
        stationcount: request.yar.get('nooflocation'),
        displayBacklink: true,
        hrefq: backUrl
      })
    } else if (request.params.pollutants === 'null') {
      const errorData = englishNew.custom.errorText.uk
      const errorSection = errorData?.fields
      setErrorMessage(request, errorSection?.title, errorSection?.text)
      const errors = request.yar?.get('errors')
      const errorMessage = request.yar?.get('errorMessage')
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')

      // Check if JavaScript is disabled by looking for noscript indicator
      const isNoJS =
        request.headers['user-agent']?.includes('noscript') ||
        request.query?.nojs === 'true' ||
        !request.headers.accept?.includes('text/javascript')

      const templatePath = isNoJS
        ? 'add_pollutant/index_nojs'
        : 'add_pollutant/index'

      return h.view(templatePath, {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        errors,
        errorMessage,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    } else {
      // Check for pollutants from session (from add_pollutant page)
      const sessionPollutants = request.yar.get('selectedPollutants')
      if (sessionPollutants && sessionPollutants.length > 0) {
        request.yar.set('selectedpollutant', sessionPollutants)
        // Don't clear the session pollutants - keep them for form pre-population
        // request.yar.set('selectedPollutants', null)
      } else if (request.params.pollutants !== undefined) {
        let selectedpollutant = request.params.pollutants
        if (
          selectedpollutant === 'core' ||
          selectedpollutant === 'compliance'
        ) {
          if (selectedpollutant === 'core') {
            selectedpollutant = [
              'Fine particulate matter (PM2.5)',
              'Particulate matter (PM10)',
              'Nitrogen dioxide (NO2)',
              'Ozone (O3)',
              'Sulphur dioxide (SO2)'
            ]
          } else if (selectedpollutant === 'compliance') {
            selectedpollutant = [
              'Fine particulate matter (PM2.5)',
              'Particulate matter (PM10)',
              'Nitrogen dioxide (NO2)',
              'Ozone (O3)',
              'Sulphur dioxide (SO2)',
              'Nitric oxide (NO)',
              'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
              'Carbon monoxide (CO)'
            ]
          }
        } else {
          // let selectedpollutant = request.yar.get('selectedpollutant');
          if (Array.isArray(selectedpollutant)) {
            if (
              selectedpollutant.length === 1 &&
              selectedpollutant[0].includes(',')
            ) {
              selectedpollutant = selectedpollutant[0]
                .split(',')
                .map((s) => s.trim())
            }
          } else if (typeof selectedpollutant === 'string') {
            selectedpollutant = selectedpollutant
              .split(',')
              .map((s) => s.trim())
          }

          //  request.yar.set('selectedpollutant', selectedpollutant)
        }
        request.yar.set('selectedpollutant', selectedpollutant)
      }

      // Check for time period from session (from year_aurn page)
      const sessionTimePeriod = request.yar.get('selectedTimePeriod')
      if (sessionTimePeriod) {
        request.yar.set('selectedyear', sessionTimePeriod)
        // Don't clear the session time period - keep it for form pre-population
        // when user clicks "change" to go back to year selection
      } else if (request.path?.includes('/year')) {
        request.yar.set('selectedyear', request.params.year)
      }

      if (request.path?.includes('/location')) {
        let selectedCountry = request.payload.country
        if (selectedCountry && !Array.isArray(selectedCountry)) {
          selectedCountry = [selectedCountry]
        }
      }

      if (
        request.yar.get('selectedlocation') &&
        request.yar.get('selectedyear') &&
        request.yar.get('selectedpollutant')
      ) {
        // Extract only the year if selectedYear is a range like "1 January to 31 December 2024"
        const selectedyear = request.yar.get('selectedyear') // e.g. "1 January to 12 November 2025"

        const years = selectedyear.match(/\d{4}/g)

        let finalyear
        if (years && years.length === 2) {
          request.yar.set('yearrange', 'Multiple')
          // Range case
          const start = parseInt(years[0], 10)
          const end = parseInt(years[1], 10)
          const yearList = []
          for (let y = start; y <= end; y++) {
            yearList.push(y)
          }
          finalyear = yearList.join(',')
          request.yar.set('finalyear', finalyear)
        } else if (years && years.length === 1) {
          request.yar.set('yearrange', 'Single')
          // Only one year present
          finalyear = years[0]
          request.yar.set('finalyear', finalyear)
        } else {
          finalyear = ''
        }

        const pollutantNames = {
          'Fine particulate matter (PM2.5)': 'PM2.5',
          'Particulate matter (PM10)': 'PM10',
          'Nitrogen dioxide (NO2)': 'Nitrogen dioxide',
          'Ozone (O3)': 'Ozone',
          'Sulphur dioxide (SO2)': 'Sulphur dioxide',
          'Nitric oxide (NO)': null, // Not in output
          'Nitrogen oxides as nitrogen dioxide (NOx as NO2)':
            'Nitrogen oxides as nitrogen dioxide',
          'Carbon monoxide (CO)': 'Carbon monoxide'
        }

        const formattedPollutants = request.yar
          .get('selectedpollutant')
          .map((p) => pollutantNames[p] || p)
          .join(',')

        request.yar.set('formattedPollutants', formattedPollutants)

        let stationcountparameters
        if (request.yar.get('Location') === 'Country') {
          stationcountparameters = {
            pollutantName: formattedPollutants,
            dataSource: 'AURN',
            Region: request.yar.get('selectedlocation').join(','),
            regiontype: 'Country',
            Year: finalyear,
            dataselectorfiltertype: 'dataSelectorCount',
            dataselectordownloadtype: ''
          }
        } else {
          stationcountparameters = {
            pollutantName: formattedPollutants,
            dataSource: 'AURN',
            Region: request.yar.get('selectedLAIDs'),
            // Region: '1,359,360,4',
            regiontype: 'LocalAuthority',
            Year: finalyear,
            dataselectorfiltertype: 'dataSelectorCount',
            dataselectordownloadtype: ''
          }
        }

        //  console.log('stationcountparameters', stationcountparameters)
        request.yar.set('finalyear1', finalyear)
        const stationcount = await Invokestationcount(stationcountparameters)
        request.yar.set('Region', request.yar.get('selectedlocation').join(','))
        request.yar.set('nooflocation', stationcount)
      }
      async function Invokestationcount(stationcountparameters) {
        // prod
        try {
          const response = await axios.post(
            config.get('Download_aurn_URL'),
            stationcountparameters
          )

          return response.data
        } catch (error) {
          return error // Rethrow the error so it can be handled appropriately
        }

        // dev
        // try {
        //   const url =
        //     'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
        //   const {payload } = await Wreck.post(url, {
        //     payload: JSON.stringify(stationcountparameters),
        //     headers: {
        //       'x-api-key': 'E5u7Pq9NBl7WOMK3xedmjgu5aG7okT1O',
        //       'Content-Type': 'application/json'
        //     },
        //     json: true
        //   })

        //   return payload
        // } catch (error) {
        //   //console.error('Error fetching station count:', error)
        //   return error // Rethrow the error so it can be handled appropriately
        // }
      }
      //  console.log(' selectedlocationyar', request.yar.get('selectedlocation'))
      return h.view('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: request.yar.get('selectedpollutant'),
        selectedyear: request.yar.get('selectedyear'),
        selectedlocation: request.yar.get('selectedlocation'),
        stationcount: request.yar.get('nooflocation'),
        displayBacklink: true,
        hrefq: backUrl
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
