import { getpollutantsDetailsController } from '~/src/server/year_pollutiondetails/controller.js'

// Define the route configuration function
const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/year',
      ...getpollutantsDetailsController
    },
    {
      method: 'GET',
      path: '/some-path',
      handler: (request, h) => {
        // console.log('Redirecting to /invalid-path')
        return h.redirect('/invalid-path')
      }
    }
  ])
}

// Define the plugin
const yearId = {
  plugin: {
    name: 'year{id}',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { yearId, configureRoutes }
