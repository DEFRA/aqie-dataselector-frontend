import { postJson, getJson } from './api-client.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'

jest.mock('axios')
jest.mock('@hapi/wreck')
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))

describe('postJson', () => {
  const configValues = {
    isDevelopment: false,
    devUrlKey: 'http://dev.example.com/',
    urlKey: 'http://prod.example.com/',
    DevApiKey: 'dev-key'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') {
        return configValues.isDevelopment
      }
      if (key === 'devUrlKey') {
        return configValues.devUrlKey
      }
      if (key === 'urlKey') {
        return configValues.urlKey
      }
      return configValues.DevApiKey
    })
  })

  it('posts via Wreck to the dev URL when isDevelopment is true', async () => {
    configValues.isDevelopment = true
    Wreck.post.mockResolvedValue({ payload: Buffer.from('{"ok":true}') })

    const result = await postJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      payload: { a: 1 },
      label: 'Test API'
    })

    expect(Wreck.post).toHaveBeenCalledWith(
      configValues.devUrlKey,
      expect.objectContaining({ payload: JSON.stringify({ a: 1 }) })
    )
    expect(result).toEqual({ ok: true })
  })

  it('returns null when the dev Wreck call fails', async () => {
    configValues.isDevelopment = true
    Wreck.post.mockRejectedValue(new Error('dev failure'))

    const result = await postJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      payload: { a: 1 },
      label: 'Test API'
    })

    expect(result).toBeNull()
  })

  it('posts via axios to the prod URL when isDevelopment is false', async () => {
    configValues.isDevelopment = false
    axios.post.mockResolvedValue({ data: { ok: true } })

    const result = await postJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      payload: { a: 1 },
      label: 'Test API'
    })

    expect(axios.post).toHaveBeenCalledWith(configValues.urlKey, { a: 1 })
    expect(result).toEqual({ ok: true })
  })

  it('rethrows when the prod axios call fails', async () => {
    configValues.isDevelopment = false
    axios.post.mockRejectedValue(new Error('prod failure'))

    await expect(
      postJson({
        devUrlKey: 'devUrlKey',
        urlKey: 'urlKey',
        payload: { a: 1 },
        label: 'Test API'
      })
    ).rejects.toThrow('prod failure')
  })
})

describe('getJson', () => {
  const configValues = {
    isDevelopment: false,
    devUrlKey: 'http://dev.example.com/',
    urlKey: 'http://prod.example.com/',
    DevApiKey: 'dev-key'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') {
        return configValues.isDevelopment
      }
      if (key === 'devUrlKey') {
        return configValues.devUrlKey
      }
      if (key === 'urlKey') {
        return configValues.urlKey
      }
      return configValues.DevApiKey
    })
  })

  it('gets via Wreck from the dev URL when isDevelopment is true', async () => {
    configValues.isDevelopment = true
    Wreck.get.mockResolvedValue({ payload: Buffer.from('{"station":{}}') })

    const result = await getJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      path: 'by-location',
      params: { lat: '51.5', lng: '-0.1' },
      label: 'Station by location API'
    })

    expect(Wreck.get).toHaveBeenCalledWith(
      `${configValues.devUrlKey}by-location?lat=51.5&lng=-0.1`,
      expect.objectContaining({
        headers: { 'x-api-key': configValues.DevApiKey }
      })
    )
    expect(result).toEqual({ station: {} })
  })

  it('returns null when the dev Wreck call fails', async () => {
    configValues.isDevelopment = true
    Wreck.get.mockRejectedValue(new Error('dev failure'))

    const result = await getJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      path: 'by-location',
      params: { lat: '51.5', lng: '-0.1' },
      label: 'Station by location API'
    })

    expect(result).toBeNull()
  })

  it('gets via axios from the prod URL when isDevelopment is false', async () => {
    configValues.isDevelopment = false
    axios.get.mockResolvedValue({ data: { station: {} } })

    const result = await getJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      path: 'by-location',
      params: { lat: '51.5', lng: '-0.1' },
      label: 'Station by location API'
    })

    expect(axios.get).toHaveBeenCalledWith(
      `${configValues.urlKey}by-location?lat=51.5&lng=-0.1`
    )
    expect(result).toEqual({ station: {} })
  })

  it('returns null when the prod axios call fails', async () => {
    configValues.isDevelopment = false
    axios.get.mockRejectedValue(new Error('prod failure'))

    const result = await getJson({
      devUrlKey: 'devUrlKey',
      urlKey: 'urlKey',
      path: 'by-location',
      params: { lat: '51.5', lng: '-0.1' },
      label: 'Station by location API'
    })

    expect(result).toBeNull()
  })
})
