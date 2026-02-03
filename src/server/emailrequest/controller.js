/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
// import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import axios from 'axios'
async function Invokestationcount(stationcountparameters) {
  // prod
  try {
    const response = await axios.post(
      config.get('email_URL'),
      stationcountparameters
    )

    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }

  // dev
  // try {
  //   const url =
  //     'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomEmailJobDataSelection/'
  //   const {payload } = await Wreck.post(url, {
  //     payload: JSON.stringify(stationcountparameters),
  //     headers: {
  //       'x-api-key': 'r4Rmu3MxFjnsgLSGtVkH6FLLSfTzhIak',
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
export const emailrequestController = {
  handler: async (request, h) => {
    const backUrl = '/download_dataselectornojs'
    // console.log('comes here into email')
    // const { home } = englishNew.custom
    if (request.path?.includes('/confirm')) {
      //  console.log('params from confirm', request.payload?.email)
      // console.log('comes into confirm')

      // Get email from form payload
      const email = request.payload?.email
      request.yar.set('email', email)

      // Email validation function
      const isValidEmail = (email) => {
        if (!email || typeof email !== 'string') return false

        // Basic email regex pattern
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        return emailRegex.test(email.trim())
      }

      // Check if email is provided and valid
      if (!email) {
        //  console.log('No email provided')
        return h.view('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          error: 'Please enter an email address',
          email // Preserve the entered value
        })
      }

      if (!isValidEmail(email)) {
        // console.log('Invalid email format:', email)
        return h.view('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          error: 'Please enter a valid email address',
          email // Preserve the entered value
        })
      }

      //  console.log('Valid email provided:', email)

      const stationcountparameters = {
        pollutantName: request.yar.get('formattedPollutants'),
        dataSource: 'AURN',
        Region: request.yar.get('selectedlocation').join(','),
        regiontype: request.yar.get('Location'),
        Year: request.yar.get('finalyear1'),
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorMultiple',
        email: request.yar.get('email') // Use the validated email instead of hardcoded value
      }
      const result = await Invokestationcount(stationcountparameters)
      //  console.log('comes into confirm', result)
      if (result === 'Success') {
        return h.view('emailrequest/requestconfirm.njk', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts

          //  selectedpollutant: request.yar.get('selectedpollutant')
        })
      } else {
        // Redirect to existing problem with service page when API call fails
        return h.redirect(
          '/check-air-quality/problem-with-service?statusCode=500'
        )
      }
    } else {
      return h.view('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl
        //  selectedpollutant: request.yar.get('selectedpollutant')
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
