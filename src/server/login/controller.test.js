import {
  loginController,
  homeloginController
} from '~/src/server/login/controller.js'

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'aqiePassword') return 'securePassword'
    })
  }
}))

describe('homeloginController', () => {
  let request, h

  beforeEach(() => {
    request = {
      auth: { isAuthenticated: false },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn(),
      redirect: jest.fn()
    }
  })

  it('should redirect to /home if user is authenticated', () => {
    request.auth.isAuthenticated = true

    const result = homeloginController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/home')
    expect(result).toBe(h.redirect('/home'))
  })

  it('should render login page with errors if not authenticated', () => {
    request.yar.get.mockImplementation((key) => {
      const values = {
        errors: { errors: [{ text: 'Invalid' }] },
        errorMessage: { errorMessage: 'Wrong password' }
      }
      return values[key]
    })

    homeloginController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('login/index', {
      page: 'title',
      errors: [{ text: 'Invalid' }],
      errorMessage: 'Wrong password'
    })

    expect(request.yar.set).toHaveBeenCalledWith('errors', null)
    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', null)
  })
})

describe('loginController', () => {
  let request, h

  beforeEach(() => {
    request = {
      payload: { password: '' },
      yar: {
        set: jest.fn()
      },
      cookieAuth: {
        set: jest.fn()
      }
    }

    h = {
      redirect: jest.fn()
    }
  })

  it('should redirect to /home on correct password', () => {
    request.payload.password = 'securePassword'

    const result = loginController.handler(request, h)

    expect(request.cookieAuth.set).toHaveBeenCalledWith({
      password: 'securePassword'
    })
    expect(h.redirect).toHaveBeenCalledWith('/home')
    expect(result).toBe(h.redirect('/home'))
  })

  it('should redirect to / and set error messages on incorrect password', () => {
    request.payload.password = 'wrongPassword'

    const result = loginController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('errors', {
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

    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', {
      errorMessage: {
        text: 'The password is not correct'
      }
    })

    expect(h.redirect).toHaveBeenCalledWith('/')
    expect(result).toBe(h.redirect('/'))
  })
})
