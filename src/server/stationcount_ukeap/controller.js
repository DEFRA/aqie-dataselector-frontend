export const stationcountUkeapController = {
  handler: (request, h) => {
    const stationcount = request.yar.get('nooflocationukeap')

    if (
      stationcount == null ||
      stationcount instanceof Error ||
      stationcount?.isAxiosError ||
      (typeof stationcount === 'object' && stationcount?.message)
    ) {
      return h.response({ error: true, stationcount: 0 }).code(200)
    }

    return h.response({ stationcount }).code(200)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
