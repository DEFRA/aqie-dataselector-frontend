import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
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
  googleAnalytics: {
    googleTagManagerKeys: {
      doc: 'Comma-separated Google Tag Manager container IDs',
      format: String,
      default: 'GTM-5ZWS27T3',
      env: 'GOOGLE_TAG_MANAGER_KEYS'
    }
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
  featureFlags: {
    viewGraphSummary: {
      doc: 'Show the view graph and pollutant summary CTA on station detail pages',
      format: Boolean,
      default: true,
      env: 'VIEW_GRAPH_SUMMARY_ENABLED'
    }
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
        default: 'session_cookie',
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
        doc: 'session cookie password - must be supplied via SESSION_COOKIE_PASSWORD env var (min 32 chars), no default is provided for security reasons',
        format: String,
        default: null,
        nullable: true,
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
  Polling_URL: {
    doc: 'connect to get job status',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionJobStatus/`,
    env: 'Polling_URL'
  },
  email_URL: {
    doc: 'connect to send email details',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomEmailJobDataSelection/`,
    env: 'Email_URL'
  },
  downloadEmailUrl: {
    doc: 'connect to get download email details',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionPresignedUrlMail/`,
    env: 'DOWNLOAD_EMAIL_URL'
  },

  DevApiKey: {
    doc: 'Common API key for all dev endpoints (localhost only)',
    format: String,
    default: '',
    sensitive: true,
    env: 'OS_NAMES_DEV_API_KEYS'
  },
  osLocationDevUrl: {
    doc: 'Location API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-location-backend/osnameplaces',
    env: 'OS_LOCATION_DEV_URL'
  },
  osMonitoringStationDevUrl: {
    doc: 'Monitoring station API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-monitoringstation-backend/monitoringstation/',
    env: 'OS_MONITORING_STATION_DEV_URL'
  },
  tableDevUrl: {
    doc: 'Table (exceedence) API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomHistoryexceedence/',
    env: 'TABLE_DEV_URL'
  },
  downloadDevUrl: {
    doc: 'Download API URL for localhost development',
    format: String,
    default: `https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomHistoryHourlydata/`,
    env: 'DOWNLOAD_DEV_URL'
  },
  pollutantMasterDevUrl: {
    doc: 'Pollutant master API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionPollutantMaster',
    env: 'POLLUTANT_MASTER_DEV_URL'
  },
  pollutantMasterApiUrl: {
    doc: 'Pollutant master API URL for CDP environments',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionPollutantMaster`,
    env: 'POLLUTANT_MASTER_API_URL'
  },
  regionMasterDevUrl: {
    doc: 'Region (zone) master API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionRegionMaster',
    env: 'REGION_MASTER_DEV_URL'
  },
  regionMasterApiUrl: {
    doc: 'Region (zone) master API URL for CDP environments',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionRegionMaster`,
    env: 'REGION_MASTER_API_URL'
  },
  agglomerationMasterDevUrl: {
    doc: 'Agglomeration master API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionAgglomerationMaster',
    env: 'AGGLOMERATION_MASTER_DEV_URL'
  },
  agglomerationMasterApiUrl: {
    doc: 'Agglomeration master API URL for CDP environments',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionAgglomerationMaster`,
    env: 'AGGLOMERATION_MASTER_API_URL'
  },
  datasourceDevUrl: {
    doc: 'Datasource API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionPollutantDataSource',
    env: 'DATASOURCE_DEV_URL'
  },
  datasourceApiUrl: {
    doc: 'Datasource API URL for CDP environments',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelectionPollutantDataSource`,
    env: 'DATASOURCE_API_URL'
  },
  stationCountDevUrl: {
    doc: 'Station count API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection',
    env: 'STATION_COUNT_DEV_URL'
  },
  downloadAurnDevUrl: {
    doc: 'Download job creation API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection',
    env: 'DOWNLOAD_AURN_DEV_URL'
  },
  pollingDevUrl: {
    doc: 'Job status polling API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionJobStatus',
    env: 'POLLING_DEV_URL'
  },
  emailDevUrl: {
    doc: 'Email request API URL for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomEmailJobDataSelection/',
    env: 'EMAIL_DEV_URL'
  },
  downloadEmailDevUrl: {
    doc: 'Download email presigned URL API for localhost development',
    format: String,
    default:
      'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelectionPresignedUrlMail',
    env: 'DOWNLOAD_EMAIL_DEV_URL'
  },
  stationCountApiUrl: {
    doc: 'Station count API URL for CDP environments',
    format: String,
    default: `https://aqie-historicaldata-backend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud/AtomDataSelection`,
    env: 'STATION_COUNT_API_URL'
  },
  laqmAPIkey: {
    doc: 'laqmAPIkey',
    format: String,
    default: 'LAQMAPIKEY',
    env: 'LAQMAPIKEY'
  },
  laqmAPIPartnerId: {
    doc: 'laqmAPIPartnerId',
    format: String,
    default: 'LAQMAPIPARTNERID',
    env: 'LAQMAPIPARTNERID'
  }
})

config.validate({ allowed: 'strict' })

if (!config.get('session.cookie.password')) {
  throw new Error(
    'SESSION_COOKIE_PASSWORD environment variable must be set (min 32 characters). ' +
      'No default is provided because a hardcoded session secret is a security risk.'
  )
}

/**
 * @import { Schema, SchemaObj } from 'convict'
 * @import { RedisConfig } from '~/src/server/common/helpers/redis-client.js'
 */
