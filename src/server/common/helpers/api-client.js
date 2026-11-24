import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const MAX_LOG_VALUE_LENGTH = 2000

function safeSerialize(value) {
  try {
    const text = JSON.stringify(value)
    if (typeof text !== 'string') {
      return String(text)
    }
    return text.length > MAX_LOG_VALUE_LENGTH
      ? `${text.slice(0, MAX_LOG_VALUE_LENGTH)}…[truncated]`
      : text
  } catch {
    return '[unserializable]'
  }
}

function toErrorDetails(error) {
  return {
    message: error?.message || 'Unknown error',
    code: error?.code,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    cause: error?.cause?.message || error?.cause,
    responseData: error?.response?.data
  }
}

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
    const url = String(config.get(devUrlKey))
    logger.info(`[${label}] POST ${url} | payload=${safeSerialize(payload)}`)
    try {
      const { payload: body } = await Wreck.post(url, {
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
      logger.warn(
        `[${label}] POST failed | url=${url} | payload=${safeSerialize(payload)} | error=${safeSerialize(toErrorDetails(error))}`
      )
      return null
    }
  }

  const url = String(config.get(urlKey))
  logger.info(`[${label}] POST ${url} | payload=${safeSerialize(payload)}`)

  try {
    const response = await axios.post(url, payload)
    return response.data
  } catch (error) {
    logger.error(
      `[${label}] POST failed | url=${url} | payload=${safeSerialize(payload)} | error=${safeSerialize(toErrorDetails(error))}`
    )
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
    const url = `${String(config.get(devUrlKey))}${path}?${query}`
    logger.info(`[${label}] GET ${url}`)
    try {
      const { payload: body } = await Wreck.get(url, {
        headers: { 'x-api-key': config.get('DevApiKey') }
      })
      return JSON.parse(body.toString())
    } catch (error) {
      logger.warn(
        `[${label}] GET failed | url=${url} | error=${safeSerialize(toErrorDetails(error))}`
      )
      return null
    }
  }

  const url = `${String(config.get(urlKey))}${path}?${query}`
  logger.info(`[${label}] GET ${url}`)

  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    logger.error(
      `[${label}] GET failed | url=${url} | error=${safeSerialize(toErrorDetails(error))}`
    )
    return null
  }
}
