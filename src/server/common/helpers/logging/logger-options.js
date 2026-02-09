import { ecsFormat } from '@elastic/ecs-pino-format'
import { config } from '~/src/config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

const defaultLogConfig = {
  enabled: true,
  redact: [],
  level: 'info',
  format: 'ecs'
}

const logConfig = config.get('log') ?? defaultLogConfig
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled ?? defaultLogConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact ?? defaultLogConfig.redact,
    remove: true
  },
  level: logConfig.level ?? defaultLogConfig.level,
  ...formatters[
    formatters[logConfig.format] ? logConfig.format : defaultLogConfig.format
  ],
  nesting: true,
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */
