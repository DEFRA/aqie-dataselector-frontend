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
        }
      })
      // Wreck doesn't parse the body itself
      return JSON.parse(body.toString())
    } catch (error) {
      // Error objects hold circular refs (e.g. sockets) that can't be stored in the session, so return null instead
      logger.warn(`${label} error: ${error.message}`)
      return null
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

/**
 * GETs from one of the platform APIs, following the same dev/production
 * branching as postJson (see above for why the branches differ).
 * @param {object} options
 * @param {string} options.devUrlKey config key holding the localhost dev URL
 * @param {string} options.urlKey config key holding the deployed URL
 * @param {string} options.path appended to the base URL (e.g. 'by-location')
 * @param {Record<string, string>} options.params query string params
 * @param {string} options.label name used in the error log line
 * @returns {Promise<any>} the response body, or null on failure
 */
export async function getJson({ devUrlKey, urlKey, path, params, label }) {
  const query = new URLSearchParams(params).toString()

  if (config.get('isDevelopment')) {
    try {
      const { payload: body } = await Wreck.get(
        `${String(config.get(devUrlKey))}${path}?${query}`,
        {
          headers: { 'x-api-key': config.get('DevApiKey') }
        }
      )
      return JSON.parse(body.toString())
    } catch (error) {
      logger.warn(`${label} error: ${error.message}`)
      return null
    }
  }

  try {
    const response = await axios.get(
      `${String(config.get(urlKey))}${path}?${query}`
    )
    return response.data
  } catch (error) {
    logger.error(`${label} error: ${error.message}`)
    return null
  }
}
