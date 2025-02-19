import { monitoringStationController } from '~/src/server/monitoring-station/controller.js'

export const monitoringStation = {
  plugin: {
    name: 'monitoring-station',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/monitoring-station',
          ...monitoringStationController
        }
      ])
    }
  }
}
