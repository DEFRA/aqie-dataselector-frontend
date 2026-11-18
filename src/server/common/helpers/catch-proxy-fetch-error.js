import { proxyFetch } from '~/src/server/common/helpers/proxy.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
const logger = createLogger()

// fetch only says "fetch failed"; the real reason (e.g. proxy refused,
// certificate or timeout) is in error.cause, so include it in the log
function describeCause(error) {
  const cause = error?.cause
  if (!cause) {
    return ''
  }
  const code = cause.code ? `${cause.code} ` : ''
  const message = cause.message ?? String(cause)
  return ` (cause: ${code}${message})`
}

async function catchProxyFetchError(url, options) {
  try {
    const startTime = performance.now()
    const date = new Date().toUTCString()
    const response = await proxyFetch(url, options)
    const endTime = performance.now()
    const duration = endTime - startTime
    logger.info(
      `API response.status: ${response.status} from ${url} fetch took ${date} ${duration} milliseconds`
    )
    const statusCode = response.status
    if (!response.ok) {
      logger.info(
        `Failed to fetch data from ${url}: ${JSON.stringify(response)}`
      )
      throw new Error(`HTTP error! status from ${url}: ${response.status}`)
    }
    const data = await response.json()
    return [statusCode, data]
  } catch (error) {
    logger.error(
      `Failed to proxyFetch data from ${url}: ${error.message}${describeCause(error)}`
    )
    return [error]
  }
}

export { catchProxyFetchError }
