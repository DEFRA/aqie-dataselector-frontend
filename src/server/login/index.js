import {
  homeloginController,
  loginController
} from '~/src/server/login/controller.js'

const login = {
  plugin: {
    name: 'login',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...homeloginController,
          options: { auth: { mode: 'try' } }
        },
        {
          method: 'POST',
          path: '/',
          ...loginController,
          options: { auth: { mode: 'try' } }
        }
      ])
    }
  }
}

export { login }
