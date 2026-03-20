/**
 * HTTP Status Codes
 * Constants to avoid magic numbers in the codebase
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,

  // Client errors
  BAD_REQUEST: 400,
  NOT_FOUND: 404,

  // Server errors
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,

  // Range boundaries
  MIN_STATUS_CODE: 100,
  MAX_STATUS_CODE: 599
}
