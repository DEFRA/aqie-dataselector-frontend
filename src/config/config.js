import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'
const longpass = 'the-password-must-be-at-least-32-characters-long'
export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Get air pollution data'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },

  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : []
    }
  },
  httpProxy: /** @type {SchemaObj<string | null>} */ ({
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  }),
  httpsProxy: /** @type {SchemaObj<string | null>} */ ({
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  }),
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: longpass,
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  redis: /** @type {Schema<RedisConfig>} */ ({
    enabled: {
      doc: 'Enable Redis on your Frontend. Before you enable Redis, contact the CDP platform team as we need to set up config so you can run Redis in CDP environments',
      format: Boolean,
      default: false,
      env: 'REDIS_ENABLED'
    },
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'cdp-node-frontend-template:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    backendApiUrl: {
      doc: 'Backend api url',
      format: String,
      default: 'https://aiqe-dataservice-backend.dev.cdp-int.defra.cloud',
      env: 'BACKEND_API_URL'
    },

    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  }),
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },

  OS_NAMES_API_URL: {
    doc: 'Osname api url',
    format: String,
    default: `https://aqie-location-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/osnameplaces/`,
    env: 'Osname api url'
  },
  OS_NAMES_API_URL_1: {
    doc: 'connect to get monitoring station prod',
    format: String,
    default: `https://aqie-monitoringstation-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/monitoringstation/`,
    env: 'OS_NAMES_API_URL_1'
  },
  Download_URL: {
    doc: 'connect to get download data prod',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomHistoryHourlydata/`,
    env: 'Download_URL'
  },
  Table_URL: {
    doc: 'connect to get table data prod',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomHistoryexceedence/`,
    env: 'Table_URL'
  },

  Download_aurn_URL: {
    doc: 'connect to get table data dev',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelection/`,
    env: 'Download_aurn_URL'
  },

  // dev //

  // OS_NAMES_API_URL: {
  //   doc: 'Osname api url',
  //   format: String,

  //   default: `https://aqie-location-backend.dev.cdp-int.defra.cloud/osnameplaces/`,

  //   env: 'Osname api url'
  // },

  // Download_aurn_URL: {
  //   doc: 'connect to get table data dev',
  //   format: String,
  //   default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelection/`,
  //   env: 'Download_aurn_URL'
  // },
  // cdpXApiKey: {
  //   default: 'TqiCb1bIXR3R7nRmZbNLLHT7fERKTrWb'
  // },
  // OS_NAMES_API_URL_1: {
  //   doc: 'connect monitoringstn dev',
  //   format: String,
  //   default: `https://aqie-monitoringstation-backend.dev.cdp-int.defra.cloud/monitoringstation/`,
  //   env: 'OS_NAMES_API_URL_1'
  // },
  // Download_URL: {
  //   doc: 'connect to s3 bucket dev',
  //   format: String,
  //   default: `https://aqie-historicaldata-backend.dev.cdp-int.defra.cloud/AtomHistoryHourlydata/`,
  //   env: 'Download_URL'
  // },
  // Table_URL: {
  //   doc: 'connect to get table data dev',
  //   format: String,
  //   default: `https://aqie-historicaldata-backend.dev.cdp-int.defra.cloud/AtomHistoryexceedence/`,
  //   env: 'Table_URL'
  // },
  // Download_aurn_URL: {
  //   doc: 'connect to get table data dev',
  //   format: String,
  //   default: `https://aqie-historicaldata-backend.dev.cdp-int.defra.cloud/AtomDataSelection/`,
  //   env: 'Download_aurn_URL'
  // },
  aqiePassword: {
    doc: 'password for daqie',
    format: '*',
    default: 'airqualitydataset',
    sensitive: true,
    env: 'AQIE_PASSWORD'
  },
  cookiePassword: {
    doc: 'password for  cookie',
    format: '*',
    default: longpass,
    sensitive: true,
    env: 'COOKIE_PASSWORD'
  },
  sessionCookiePassword: {
    doc: 'session password for  cookie',
    format: '*',
    default: longpass,
    sensitive: true,
    env: 'SESSION_COOKIE_PASSWORD'
  }
})

config.validate({ allowed: 'strict' })

/**
 * @import { Schema, SchemaObj } from 'convict'
 * @import { RedisConfig } from '~/src/server/common/helpers/redis-client.js'
 */
