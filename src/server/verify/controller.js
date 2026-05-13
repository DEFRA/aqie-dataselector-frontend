/**
 * Controller for handling verification requests with unique ID and timestamp
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_REQUEST_TIMEOUT_MS,
  TWO_DAYS_MS
} from '~/src/server/common/constants/magic-numbers.js'
const logger = createLogger()

async function invokeDownloadEmail(apiparams) {
  const emailParams = { jobID: apiparams.id }

  try {
    logger.info('About to call axios.post...')
    const response = await axios.post(
      config.get('downloadEmailUrl'),
      emailParams,
      {
        timeout: HTTP_REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    logger.info('Axios call completed successfully')

    const emaildownloadUrl = response.data

    return emaildownloadUrl
  } catch (error) {
    logger.error(`Error invoking download email API: ${error.message}`)
    logger.error(`Error stack: ${error.stack}`)
    logger.error(`Error name: ${error.name}`)
    if (error.code) {
      logger.error(`Error code: ${error.code}`)
    }
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`)
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`)
    }
    return error
  }
}

export const verifyController = {
  async handler(request, h) {
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
    const providedTime = Number.parseInt(timestamp, 10)

    if (
      Number.isNaN(providedTime) ||
      currentTime - providedTime > TWO_DAYS_MS
    ) {
      // console.log('Link has expired. Current time:', currentTime, 'Provided time:', providedTime)
      return h.view('verify/index_exp', {
        pageTitle: 'Link Expired',
        heading: 'Your link has expired',
        message:
          'The download link had expired. Download links expire after 48 hours.',
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
