function setErrorMessage(request, titleText, errorListText) {
  request.yar.set('errors', {
    list: {
      titleText,
      errorList: [
        {
          text: errorListText,
          href: '#itembox'
        }
      ]
    }
  })
  request.yar.set('errorMessage', {
    message: { text: errorListText }
  })

  return true
}

function catchAll(request, h) {
  const { response } = request

  if (!response.isBoom) {
    return h.continue
  }

  request.logger.error(response)
  request.logger.error(response?.stack)
  // return  response.output
  return h.redirect(
    '/check-plant-health-information-and-import-rules/problem-with-service?statusCode=' +
      response.output.statusCode
  )
}

export { catchAll, setErrorMessage }
