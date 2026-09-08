import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * POSTs a JSON payload to one of the platform APIs.
 *
 * On localhost the dev API is called through Wreck with an API key; every
 * other environment posts to the configured URL with axios. Every caller
 * repeated this branch, so it lives here once.
 *
 * Failures surface differently by environment on purpose: locally the error is
 * returned so a missing dev key does not take the page down, while elsewhere
 * it is logged and rethrown for the controller's own error handling.
 * @param {object} options
 * @param {string} options.devUrlKey config key holding the localhost dev URL
 * @param {string} options.urlKey config key holding the deployed URL
 * @param {object} options.payload JSON request body
 * @param {string} options.label name used in the error log line
 * @returns {Promise<any>} the response body, or the error on localhost
 */
export async function postJson({ devUrlKey, urlKey, payload, label }) {
  if (config.get('isDevelopment')) {
    try {
      const { payload: body } = await Wreck.post(config.get(devUrlKey), {
        payload: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('DevApiKey')
        },
        json: true
      })
      return body
    } catch (error) {
      return error
    }
  }

  try {
    const response = await axios.post(config.get(urlKey), payload)
    return response.data
  } catch (error) {
    logger.error(`${label} error: ${error.message}`)
    throw error
  }
}
