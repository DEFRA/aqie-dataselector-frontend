import { config } from '~/src/config/config.js'

const password = config.get('aqiePassword')
const homeloginController = {
  handler: (request, h) => {
    // const { footerTxt, cookieBanner, login } = english
    if (request.auth.isAuthenticated) {
      return h.redirect('/home')
    } else {
      const errors = request.yar.get('errors')
      const errorMessage = request.yar.get('errorMessage')
      request.yar.set('errors', null)
      request.yar.set('errorMessage', null)
      return h.view('login/index', {
        page: 'title',
        errors: errors?.errors,
        errorMessage: errorMessage?.errorMessage
      })
    }
  }
}

const loginController = {
  handler: (request, h) => {
    //  console.log("request.payload.password",request.payload.password)
    if (request.payload.password === password) {
      request.cookieAuth.set({ password: request.payload.password })
      return h.redirect('/home')
    } else {
      request.yar.set('errors', {
        errors: {
          titleText: 'There is a problem',
          errorList: [
            {
              text: 'The password is not correct',
              href: '#password'
            }
          ]
        }
      })
      request.yar.set('errorMessage', {
        errorMessage: {
          text: 'The password is not correct'
        }
      })
      return h.redirect('/')
    }
  }
}

export { loginController, homeloginController }
