import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
const logger = createLogger()

async function catchFetchError(url, options) {
  try {
    const startTime = performance.now()
    const date = new Date().toUTCString()
    const response = await fetch(url, options)
    const endTime = performance.now()
    const duration = endTime - startTime
    logger.info(`API from ${url} fetch took ${date} ${duration} milliseconds`)
    if (!response.ok) {
      logger.info(
        `Failed to fetch data from ${url}: ${JSON.stringify(response)}`
      )
      throw new Error(`HTTP error! status from ${url}: ${response.status}`)
    }
    const data = await response.json()
    return [undefined, data]
  } catch (error) {
    logger.error(`Failed to fetch data from ${url}: ${error.message}`)
    return [error]
  }
}

export { catchFetchError }
