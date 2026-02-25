/**
 * Controller for handling verification requests with unique ID and timestamp
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
// import Wreck from '@hapi/wreck'
const logger = createLogger()

export const verifyController = {
  async handler(request, h) {
    // prod
    async function invokeDownloadEmail(apiparams) {
      const emailParams = { jobID: apiparams.id }
      // prod
      //   logger.info(`apiparams ${emailParams}`)
      //   logger.info(`downloadEmailUrl ${config.get('downloadEmailUrl')}`)
      try {
        logger.info('About to call axios.post...')
        const response = await axios.post(
          config.get('downloadEmailUrl'),
          emailParams,
          {
            timeout: 30000, // 30 second timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
        logger.info('Axios call completed successfully')
        const emaildownloadUrl = response.data
        // logger.info(`responseofdownload ${JSON.stringify(response)}`)
        // logger.info(`responseofdownloaddata ${JSON.stringify(response.data)}`)
        // logger.info(`emaildownloadUrl ${JSON.stringify(emaildownloadUrl)}`)
        //   logger.info(`response.status: ${response.status}`)
        //   if (response.data && typeof response.data === 'object') {
        //     logger.info(`response.data keys: ${Object.keys(response.data)}`)
        //   } else {
        //     logger.info(`response.data: ${response.data}`)
        //   }
        //   logger.info(`emaildownloadUrl type: ${typeof emaildownloadUrl}`)
        return emaildownloadUrl
      } catch (error) {
        logger.error(`Error invoking download email API: ${error.message}`)
        logger.error(`Error stack: ${error.stack}`)
        logger.error(`Error name: ${error.name}`)
        if (error.code) logger.error(`Error code: ${error.code}`)
        if (error.response) {
          logger.error(`Response status: ${error.response.status}`)
          logger.error(`Response data: ${JSON.stringify(error.response.data)}`)
        }
        return error
      }
    }
    // dev

    //     async function invokeDownloadEmail(apiparams) { // dev

    //     try {
    //        const emailParams = { jobID: apiparams.id }
    //       console.log("Goes inside invokedownload_email with apiparams:", apiparams);
    //   //  const emailParams = { jobID: '55658bec48e1419faadd7e40995f52e0' }
    //       const url =
    //         'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionPresignedUrlMail/'
    //       const { payload } = await Wreck.post(url, {
    //         payload: JSON.stringify(emailParams),
    //         headers: {
    //           'x-api-key': 'hfhzQ7Lssys4PJ4oiVDQ1y54dgqTzRtV',
    //           'Content-Type': 'application/json'
    //         },
    //         json: true
    //       })
    //       console.log('payload at email', payload)

    //     return payload
    //   } catch (error) {
    //     return error // Rethrow the error so it can be handled appropriately
    //   }
    // }
    // Extract path parameters (unique ID and timestamp)
    const { id, timestamp } = request.params

    // Log the received parameters

    // You can add validation logic here
    if (!id || !timestamp) {
      return h.view('verify/index', {
        pageTitle: 'Download',
        heading: 'Invalid Request',
        error: 'Missing required parameters: id and timestamp',
        id: null,
        timestamp: null
      })
    }

    // Check if timestamp is expired (more than 2 days old)
    const currentTime = Date.now()
    const providedTime = parseInt(timestamp, 10)
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000 // 2 days in milliseconds

    if (isNaN(providedTime) || currentTime - providedTime > twoDaysInMs) {
      // console.log('Link has expired. Current time:', currentTime, 'Provided time:', providedTime)
      return h.view('verify/index_exp', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        message:
          'This download link has expired. Download links expire after 48hours.',

        downloadEmailUrl: null,
        id: null,
        timestamp: null,
        isExpired: true
      })
    } else {
      //  console.log('Link is valid, invoking download email API with id:', id)
      const downloadEmailUrl = await invokeDownloadEmail({ id })
      logger.info(`downloadEmailUrl result type: ${typeof downloadEmailUrl}`)
      logger.info(
        `downloadEmailUrl is Error: ${downloadEmailUrl instanceof Error}`
      )
      /// / console.log('Download email URL:', downloadEmailUrl)

      // Check if API call failed
      if (downloadEmailUrl instanceof Error) {
        logger.error(
          `API call failed, redirecting to problem page: ${downloadEmailUrl.message}`
        )
        return h.redirect('/problem-with-service')
      }

      return h.view('verify/index', {
        pageTitle: 'Verification',
        heading: 'Request Received',
        message: 'Your download request has been received successfully.',
        downloadEmailUrl
      })
    }

    // You can add business logic here (e.g., database lookup, validation)
    // For now, just passing the data to the view
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
