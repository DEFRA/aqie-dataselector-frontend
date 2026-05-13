/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const EMAIL_REQUEST_VIEW = 'emailrequest/index'

async function invokeEmailRequest(emailRequestParameters) {
  if (config.get('isDevelopment')) {
    // dev
    try {
      const url = config.get('emailDevUrl')
      const { payload } = await Wreck.post(url, {
        payload: JSON.stringify(emailRequestParameters),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      // Check if payload is valid and not an error response
      if (
        !payload ||
        (typeof payload === 'string' && payload.includes('<?xml'))
      ) {
        logger.error(
          'Email request API returned invalid response (XML or empty)'
        )
        return { error: true }
      }
      return payload
    } catch (error) {
      logger.error(
        `Email request API error (local): ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return { error: true }
    }
  } else {
    // prod
    try {
      const response = await axios.post(
        config.get('email_URL'),
        emailRequestParameters
      )
      // Check if response data is valid and not an error response
      if (
        !response.data ||
        (typeof response.data === 'string' && response.data.includes('<?xml'))
      ) {
        logger.error(
          'Email request API returned invalid response (XML or empty)'
        )
        return { error: true }
      }
      return response.data
    } catch (error) {
      logger.error(
        `Email request API error: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return { error: true }
    }
  }
}
export const emailrequestController = {
  handler: async (request, h) => {
    // Determine back URL based on referrer or query parameter
    // If coming from JS version or has 'js' query param, use /download_dataselector
    // Otherwise use /download_dataselectornojs for no-JS users
    const hasJsParam = request.query?.js === 'true'
    const referrer = request.info?.referrer || ''
    const isFromJsPage =
      referrer.includes('/download_dataselector') && !referrer.includes('nojs')

    const backUrl =
      hasJsParam || isFromJsPage
        ? '/download_dataselector'
        : '/download_dataselectornojs'

    // Store dataSource from query param so it survives the POST
    const dataSourceParam = request.query?.dataSource
    if (
      dataSourceParam &&
      (dataSourceParam === 'AURN' || dataSourceParam === 'NON-AURN')
    ) {
      request.yar.set('pendingDataSource', dataSourceParam)
    }

    if (request.path?.includes('/confirm')) {
      // Get email from form payload
      const email = request.payload?.email
      request.yar.set('email', email)

      // Email validation function
      const isValidEmail = (emailAddress) => {
        if (!emailAddress || typeof emailAddress !== 'string') {
          return false
        }

        // Basic email regex pattern
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        return emailRegex.test(emailAddress.trim())
      }

      // Check if email is provided and valid
      if (!email) {
        return h.view(EMAIL_REQUEST_VIEW, {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          error: 'Enter an email address',
          email // Preserve the entered value
        })
      }

      if (!isValidEmail(email)) {
        return h.view(EMAIL_REQUEST_VIEW, {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          error: 'Enter a valid email address',
          email // Preserve the entered value
        })
      }

      // If dataSource was passed as a query param (from download page tab), update session
      const dataSourceFromQuery = request.yar.get('pendingDataSource')
      if (dataSourceFromQuery) {
        request.yar.set('selectedDatasourceType', dataSourceFromQuery)
        request.yar.clear('pendingDataSource')
      }

      // Build parameters based on region type
      const regionType = request.yar.get('Location')
      const stationcountparameters = {
        pollutantName: request.yar.get('selectedPollutantID'),
        dataSource: request.yar.get('selectedDatasourceType') || 'AURN',
        Region:
          regionType === 'Country'
            ? request.yar.get('selectedlocation').join(',')
            : request.yar.get('selectedLAIDs'),
        regiontype: regionType,
        Year: request.yar.get('finalyear1'),
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorMultiple',
        email: request.yar.get('email') // Use the validated email instead of hardcoded value
      }

      // Validate required parameters - redirect to problem-with-service if any are null or blank
      const requiredParams = [
        'pollutantName',
        'Region',
        'regiontype',
        'Year',
        'email'
      ]
      const hasInvalidParams = requiredParams.some((param) => {
        const value = stationcountparameters[param]
        return value === null || value === undefined || value === ''
      })

      if (hasInvalidParams) {
        logger.error('Email request failed - missing required parameters')
        return h.redirect('/problem-with-service?statusCode=500')
      }

      const result = await invokeEmailRequest(stationcountparameters)

      // Check for API errors - redirect to problem-with-service page
      if (
        !result ||
        result.error === true ||
        (typeof result === 'string' && result.includes('<?xml'))
      ) {
        logger.error(
          'Email request failed - redirecting to problem-with-service'
        )
        return h.redirect('/problem-with-service?statusCode=500')
      }

      if (result === 'Success') {
        return h.view('emailrequest/requestconfirm.njk', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts
        })
      } else {
        // Redirect to existing problem with service page when API call fails
        return h.redirect('/problem-with-service?statusCode=500')
      }
    } else {
      return h.view(EMAIL_REQUEST_VIEW, {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
