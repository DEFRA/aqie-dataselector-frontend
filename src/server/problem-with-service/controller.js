import { english } from '~/src/server/data/en/homecontent.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

const content = english.errorpages

function statusCodeMessage(statusCode) {
  switch (true) {
    case statusCode === statusCodes.notFound:
      return 'Page not found'
    case statusCode === statusCodes.forbidden:
      return 'Forbidden'
    case statusCode === statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCode === statusCodes.badRequest:
      return 'Bad Request'
    case statusCode === statusCodes.internalServerError:
      return 'Sorry, there is a problem with the service'
    default:
      return 'Sorry, there is a problem with the service'
  }
}

function parseStatusCode(input) {
  const value = Number.parseInt(String(input ?? ''), 10)
  if (Number.isFinite(value) && value >= 100 && value <= 599) {
    return value
  }
  return statusCodes.internalServerError
}

export const problemWithServiceController = {
  handler: (request, h) => {
    const statusCode = parseStatusCode(request.query?.statusCode)
    const message = statusCodeMessage(statusCode)

    return h
      .view('error/index', {
        pageTitle: message,
        statusCode,
        message,
        content
      })
      .code(statusCode)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
