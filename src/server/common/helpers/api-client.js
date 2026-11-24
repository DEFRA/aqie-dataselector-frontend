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

function getBaseUrl(isDevelopment, devUrlKey, urlKey) {
  const key = isDevelopment ? devUrlKey : urlKey
  return String(config.get(key))
}

function buildGetUrl(baseUrl, path, params) {
  const query = new URLSearchParams(params || {}).toString()
  return `${baseUrl}${path}?${query}`
}

function logHttpRequest(label, method, url, payload) {
  const payloadPart =
    payload === undefined ? '' : ` | payload=${safeSerialize(payload)}`
  logger.info(`[${label}] ${method} ${url}${payloadPart}`)
}

function logHttpFailure({ label, method, url, payload, error, level }) {
  const payloadPart =
    payload === undefined ? '' : ` | payload=${safeSerialize(payload)}`
  const message =
    `[${label}] ${method} failed | url=${url}${payloadPart} | error=${safeSerialize(toErrorDetails(error))}`

  if (level === 'warn') {
    logger.warn(message)
    return
  }

  logger.error(message)
}

function parseWreckJson(body) {
  return JSON.parse(body.toString())
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
  const isDevelopment = config.get('isDevelopment')
  const url = getBaseUrl(isDevelopment, devUrlKey, urlKey)
  logHttpRequest(label, 'POST', url, payload)

  if (isDevelopment) {
    try {
      const { payload: body } = await Wreck.post(url, {
        payload: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('DevApiKey')
        }
      })
      // Wreck doesn't parse the body itself
      return parseWreckJson(body)
    } catch (error) {
      // Error objects hold circular refs (e.g. sockets) that can't be stored in the session, so return null instead
      logHttpFailure({
        label,
        method: 'POST',
        url,
        payload,
        error,
        level: 'warn'
      })
      return null
    }
  }

  try {
    const response = await axios.post(url, payload)
    return response.data
  } catch (error) {
    logHttpFailure({
      label,
      method: 'POST',
      url,
      payload,
      error,
      level: 'error'
    })
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
  const isDevelopment = config.get('isDevelopment')
  const baseUrl = getBaseUrl(isDevelopment, devUrlKey, urlKey)
  const url = buildGetUrl(baseUrl, path, params)
  logHttpRequest(label, 'GET', url)

  if (isDevelopment) {
    try {
      const { payload: body } = await Wreck.get(url, {
        headers: { 'x-api-key': config.get('DevApiKey') }
      })
      return parseWreckJson(body)
    } catch (error) {
      logHttpFailure({
        label,
        method: 'GET',
        url,
        error,
        level: 'warn'
      })
      return null
    }
  }

  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    logHttpFailure({
      label,
      method: 'GET',
      url,
      error,
      level: 'error'
    })
    return null
  }
}
