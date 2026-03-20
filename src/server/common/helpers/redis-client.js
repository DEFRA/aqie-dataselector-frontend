import { Cluster, Redis } from 'ioredis'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { REDIS_SLOTS_REFRESH_TIMEOUT_MS } from '~/src/server/common/constants/magic-numbers.js'

export function buildRedisClient(redisConfig) {
  const logger = createLogger()
  const port = 6379
  const db = 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: REDIS_SLOTS_REFRESH_TIMEOUT_MS,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          db,
          ...credentials,
          ...tls
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}
