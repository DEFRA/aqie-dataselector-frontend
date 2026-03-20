/**
 * Magic number constants to avoid hardcoded numeric values
 * Follows SonarQube rule javascript:S109
 */

// HTTP Status Codes
const HTTP_OK = 200
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_INTERNAL_SERVER_ERROR = 500

// Status code range limits
const STATUS_CODE_LIMITS = {
  MIN: 100,
  MAX: 599
}

// Timeout/Timer Values (in milliseconds)
const POLL_INTERVAL_MS = 1000 // 1 second
const POLL_PROGRESS_INTERVAL_MS = 2000 // 2 seconds
const LAQM_TIMEOUT_MS = 2500 // 2.5 seconds
const REDIS_SLOTS_REFRESH_TIMEOUT_MS = 10000 // 10 seconds (Redis cluster)
const HTTP_REQUEST_TIMEOUT_MS = 30000 // 30 seconds
const STATIONCOUNT_TIMEOUT_MS = 50000 // 50 seconds
const TEST_TIMEOUT_MS = 10000 // 10 seconds (for tests)

// Time Period Constants (in milliseconds)
const ONE_HOUR_MS = 60 * 60 * 1000
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const THREE_MINUTES_MS = 3 * 60 * 1000

// LAQM Cache TTL
const LAQM_CACHE_TTL_MS = TWELVE_HOURS_MS

// Year and Data Constants
const MIN_YEAR = 1973 // AURN data start year
const EXAMPLE_YEAR = 2009 // Used in validation messages
const DATA_START_YEAR = 2018 // Air quality data collection start year
const YEAR_DIGITS = 4 // Valid year format is 4 digits
const MAX_YEARS_RANGE = 5 // Maximum years that can be selected at once
const MAX_LOCAL_AUTHORITIES = 10 // Maximum local authorities per selection

// Regulatory/Monitoring Constants
const NO2_ANNUAL_THRESHOLD = 18 // Annual NO₂ limit checks (18 times per year)

// Collection sizes and limits
const ARRAY_EMPTY_LENGTH = 0
const SINGLE_ITEM = 1

export {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
  STATUS_CODE_LIMITS,
  POLL_INTERVAL_MS,
  POLL_PROGRESS_INTERVAL_MS,
  LAQM_TIMEOUT_MS,
  REDIS_SLOTS_REFRESH_TIMEOUT_MS,
  HTTP_REQUEST_TIMEOUT_MS,
  STATIONCOUNT_TIMEOUT_MS,
  TEST_TIMEOUT_MS,
  ONE_HOUR_MS,
  TWELVE_HOURS_MS,
  ONE_DAY_MS,
  TWO_DAYS_MS,
  THREE_DAYS_MS,
  THREE_MINUTES_MS,
  LAQM_CACHE_TTL_MS,
  MIN_YEAR,
  EXAMPLE_YEAR,
  DATA_START_YEAR,
  YEAR_DIGITS,
  MAX_YEARS_RANGE,
  MAX_LOCAL_AUTHORITIES,
  NO2_ANNUAL_THRESHOLD,
  ARRAY_EMPTY_LENGTH,
  SINGLE_ITEM
}
