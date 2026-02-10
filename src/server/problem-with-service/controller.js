import { english } from '~/src/server/data/en/homecontent.js'

const content = english.errorpages

function statusCodeMessage(statusCode) {
  switch (true) {
    case statusCode === 404:
      return 'Page not found'
    case statusCode === 403:
      return 'Forbidden'
    case statusCode === 401:
      return 'Unauthorized'
    case statusCode === 400:
      return 'Bad Request'
    case statusCode === 500:
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
  return 500
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
