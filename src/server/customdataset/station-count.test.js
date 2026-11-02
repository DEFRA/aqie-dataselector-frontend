import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import {
  isStationCountError,
  buildUkeapNetworks,
  toAurnNumeric,
  invokeStationCount
} from '~/src/server/customdataset/station-count.js'

jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('@hapi/wreck', () => ({ post: jest.fn() }))
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))

const otherGroup = (networks) => [
  { category: 'Other data from Defra', networks }
]

describe('isStationCountError', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an Error', new Error('boom')],
    ['a Boom error', { isBoom: true }],
    ['an Axios error', { isAxiosError: true }],
    ['an object with a message', { message: 'failed' }]
  ])('treats %s as an error', (_label, value) => {
    expect(isStationCountError(value)).toBe(true)
  })

  it.each([
    ['a number', 15],
    ['zero', 0],
    ['a NON-AURN array', [{ networkType: 'X', count: 1 }]],
    ['an object without a message', { count: 3 }],
    ['a string', 'ok']
  ])('does not treat %s as an error', (_label, value) => {
    expect(isStationCountError(value)).toBe(false)
  })
})

describe('toAurnNumeric', () => {
  it('sums Count values from an array', () => {
    expect(toAurnNumeric([{ Count: '4' }, { Count: 6 }, { Count: 'x' }])).toBe(
      10
    )
  })

  it('converts a scalar to a number', () => {
    expect(toAurnNumeric('15')).toBe(15)
  })
})

describe('buildUkeapNetworks', () => {
  it('uses the single selected network name for a numeric count', () => {
    expect(
      buildUkeapNetworks(
        7,
        otherGroup([{ name: ' UKEAP ', id: 'u1', pollutantID: 'p1' }])
      )
    ).toEqual([{ networkType: 'UKEAP', id: 'u1', pollutantID: 'p1', count: 7 }])
  })

  it('returns raw API results without Unknown when no networks are selected', () => {
    expect(
      buildUkeapNetworks(
        [
          { NetworkType: 'Net A', Count: '3' },
          { networkType: 'Net A', count: 2 },
          { networkType: 'Unknown', count: 9 },
          { count: 1 },
          { networkType: 'Net B', count: 'abc' }
        ],
        []
      )
    ).toEqual([
      { networkType: 'Net A', id: null, pollutantID: null, count: 5 },
      { networkType: 'Net B', id: null, pollutantID: null, count: 0 }
    ])
  })

  it('returns an empty list for a non-array result and no selected networks', () => {
    expect(buildUkeapNetworks(null, [])).toEqual([])
  })

  it('matches selected networks to API names and adds unexpected ones', () => {
    const result = buildUkeapNetworks(
      [
        { networkType: 'PAH Monitoring Network', count: 4 },
        { networkType: 'pah network', count: 1 },
        { networkType: 'Metals Network', count: 2 },
        { networkType: '---', count: 8 }
      ],
      otherGroup([
        { name: 'PAH Network', id: 'pah', pollutantID: 'p' },
        'Black Carbon Network',
        { name: '   ' },
        null
      ])
    )

    expect(result).toEqual([
      {
        networkType: 'PAH Monitoring Network',
        id: 'pah',
        pollutantID: 'p',
        count: 5
      },
      {
        networkType: 'Black Carbon Network',
        id: null,
        pollutantID: null,
        count: 0
      },
      { networkType: 'Metals Network', id: null, pollutantID: null, count: 2 }
    ])
  })

  it('gives every selected network a zero count when the API only returns Unknown', () => {
    expect(
      buildUkeapNetworks(
        [{ networkType: 'Unknown', count: 0 }],
        otherGroup([{ name: 'A' }, { name: 'B', id: 2 }])
      )
    ).toEqual([
      { networkType: 'A', id: null, pollutantID: null, count: 0 },
      { networkType: 'B', id: 2, pollutantID: null, count: 0 }
    ])
  })

  it('ignores a group whose networks is not an array', () => {
    expect(
      buildUkeapNetworks(
        [{ networkType: 'X', count: 1 }],
        [{ category: 'Other data from Defra', networks: 'oops' }]
      )
    ).toEqual([{ networkType: 'X', id: null, pollutantID: null, count: 1 }])
  })
})

describe('invokeStationCount', () => {
  const params = { pollutantName: 'p1' }

  function useConfig(isDevelopment) {
    const values = {
      isDevelopment,
      stationCountDevUrl: 'http://dev/count',
      stationCountApiUrl: 'http://prod/count',
      DevApiKey: 'key'
    }
    config.get.mockImplementation((key) => values[key])
  }

  describe('in production', () => {
    beforeEach(() => useConfig(false))

    it('posts the parameters to the station count API', async () => {
      axios.post.mockResolvedValue({ data: 12 })

      await expect(invokeStationCount(params)).resolves.toBe(12)
      expect(axios.post).toHaveBeenCalledWith('http://prod/count', params)
    })

    it.each([
      ['null', null, null],
      ['an array', [{ Count: 1 }], [{ Count: 1 }]],
      ['a numeric string', ' 15 ', 15],
      ['an empty string', '   ', null],
      [
        'network/count pairs',
        'NetworkType:"A",Count:"10", networkType : "B" , count : "x"',
        [
          { networkType: 'A', count: 10 },
          { networkType: 'B', count: 0 }
        ]
      ],
      ['a count-only string', 'Count:"15"', 15],
      ['a JSON string', '{"total":3}', { total: 3 }],
      ['an unparseable string', 'not valid', null],
      ['a Buffer', Buffer.from(' 9 '), 9],
      ['an object', { a: 1 }, null]
    ])('parses %s', async (_label, data, expected) => {
      axios.post.mockResolvedValue({ data })

      await expect(invokeStationCount(params)).resolves.toEqual(expected)
    })

    it('returns a 500 error when the API call fails', async () => {
      axios.post.mockRejectedValue(new Error('timeout'))

      const result = await invokeStationCount(params)

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Station count API error: timeout')
      expect(result.statusCode).toBe(500)
    })

    it('handles a non-Error rejection', async () => {
      axios.post.mockRejectedValue('bad')

      const result = await invokeStationCount(params)

      expect(result.message).toBe('Station count API error: unknown error')
    })
  })

  describe('in development', () => {
    beforeEach(() => useConfig(true))

    it('posts to the dev URL with the API key', async () => {
      Wreck.post.mockResolvedValue({ payload: '4' })

      await expect(invokeStationCount(params)).resolves.toBe(4)
      expect(Wreck.post).toHaveBeenCalledWith('http://dev/count', {
        payload: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'key' },
        json: true
      })
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('returns the error when the dev call fails', async () => {
      const error = new Error('refused')
      Wreck.post.mockRejectedValue(error)

      await expect(invokeStationCount(params)).resolves.toBe(error)
    })

    it('returns a non-Error rejection as-is', async () => {
      Wreck.post.mockRejectedValue('nope')

      await expect(invokeStationCount(params)).resolves.toBe('nope')
    })
  })
})
