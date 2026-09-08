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

/** Counterpart to setErrorMessage: drops any error held in the session. */
function clearErrors(request) {
  request.yar.set('errors', '')
  request.yar.set('errorMessage', '')
}

function catchAll(request, h) {
  const { response } = request

  if (!response.isBoom) {
    return h.continue
  }

  request.logger.error(response)
  request.logger.error(response?.stack)
  // return  response.output
  return h.redirect('/problem-with-service')
}

export { catchAll, setErrorMessage, clearErrors }
