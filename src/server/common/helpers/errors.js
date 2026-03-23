import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { english } from '~/src/server/data/en/homecontent.js'
/**
 * @param {number} statusCode
 */ const content = english.errorpages
function statusCodeMessage(statusCode) {
  if (statusCode === statusCodes.notFound) {
    return 'Page not found'
  }
  if (statusCode === statusCodes.forbidden) {
    return 'Forbidden'
  }
  if (statusCode === statusCodes.unauthorized) {
    return 'Unauthorized'
  }
  if (statusCode === statusCodes.badRequest) {
    return 'Bad Request'
  }
  if (statusCode === statusCodes.internalServerError) {
    return 'Sorry, there is a problem with the service'
  }
  return 'Sorry, there is a problem with the service'
}

/**
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      statusCode,
      message: errorMessage,
      content
    })
    .code(statusCode)
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
