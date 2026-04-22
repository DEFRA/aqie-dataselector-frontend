import { stationcountUkeapController } from './controller.js'

const makeRequest = (nooflocationukeap) => ({
  yar: { get: jest.fn().mockReturnValue(nooflocationukeap) }
})

const makeH = () => {
  const responseMock = { code: jest.fn().mockReturnThis() }
  return {
    response: jest.fn().mockReturnValue(responseMock),
    responseMock
  }
}

describe('stationcountUkeapController', () => {
  describe('error cases — returns { error: true, stationcount: 0 }', () => {
    it.each([
      ['null', null],
      ['undefined', undefined]
    ])('returns error response when stationcount is %s', (_, value) => {
      const request = makeRequest(value)
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ error: true, stationcount: 0 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns error response when stationcount is an Error instance', () => {
      const request = makeRequest(new Error('API failed'))
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ error: true, stationcount: 0 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns error response when stationcount has isAxiosError flag', () => {
      const axiosErr = { isAxiosError: true, message: 'Request failed' }
      const request = makeRequest(axiosErr)
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ error: true, stationcount: 0 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns error response when stationcount is an object with a message property', () => {
      const request = makeRequest({ message: 'Station count unavailable' })
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ error: true, stationcount: 0 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })
  })

  describe('success cases — returns { stationcount }', () => {
    it('returns stationcount when value is a positive number', () => {
      const request = makeRequest(7)
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ stationcount: 7 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns stationcount when value is 0', () => {
      const request = makeRequest(0)
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ stationcount: 0 })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns stationcount when value is an array of network objects', () => {
      const networks = [
        { networkType: 'UKEAP', count: 3 },
        { networkType: 'AGAGE', count: 1 }
      ]
      const request = makeRequest(networks)
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ stationcount: networks })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns stationcount when value is an empty array', () => {
      const request = makeRequest([])
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({ stationcount: [] })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })

    it('returns stationcount for a plain object without message or isAxiosError', () => {
      const request = makeRequest({ networkType: 'UKEAP', count: 5 })
      const { response, responseMock } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(response).toHaveBeenCalledWith({
        stationcount: { networkType: 'UKEAP', count: 5 }
      })
      expect(responseMock.code).toHaveBeenCalledWith(200)
    })
  })

  describe('session interaction', () => {
    it('reads nooflocationukeap from session', () => {
      const request = makeRequest(3)
      const { response } = makeH()
      stationcountUkeapController.handler(request, { response })
      expect(request.yar.get).toHaveBeenCalledWith('nooflocationukeap')
    })

    it('always responds with HTTP 200', () => {
      for (const value of [null, 5, new Error('x'), []]) {
        const request = makeRequest(value)
        const { response, responseMock } = makeH()
        stationcountUkeapController.handler(request, { response })
        expect(responseMock.code).toHaveBeenCalledWith(200)
      }
    })
  })
})
