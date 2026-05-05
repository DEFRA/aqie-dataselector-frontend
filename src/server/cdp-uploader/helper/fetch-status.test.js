import { fetchStatus } from './fetch-status.js'
import { config } from '~/src/config/config.js'

import fetch from 'node-fetch'

jest.mock('node-fetch')
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))

const UPLOADER_URL = 'https://cdp-uploader.dev.cdp-int.defra.cloud'

beforeEach(() => {
  jest.clearAllMocks()
  config.get.mockImplementation((key) => {
    if (key === 'cdpUploaderUrl') return UPLOADER_URL
    return undefined
  })
})

describe('fetchStatus', () => {
  it('calls the correct status endpoint with the given id', async () => {
    const mockStatus = { uploadStatus: 'ready', form: {} }
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockStatus)
    })

    const result = await fetchStatus('abc-123')

    expect(fetch).toHaveBeenCalledWith(
      `${UPLOADER_URL}/status/abc-123`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    )
    expect(result).toEqual(mockStatus)
  })

  it('returns parsed JSON response', async () => {
    const mockData = { uploadStatus: 'pending', form: { policyPdf: null } }
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData)
    })

    const result = await fetchStatus('xyz-789')

    expect(result).toEqual(mockData)
  })

  it('uses cdpUploaderUrl from config', async () => {
    const customUrl = 'https://custom-uploader.example.com'
    config.get.mockImplementation((key) => {
      if (key === 'cdpUploaderUrl') return customUrl
      return undefined
    })
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ uploadStatus: 'ready' })
    })

    await fetchStatus('id-001')

    expect(fetch).toHaveBeenCalledWith(
      `${customUrl}/status/id-001`,
      expect.anything()
    )
  })

  it('propagates fetch errors', async () => {
    fetch.mockRejectedValue(new Error('Network failure'))

    await expect(fetchStatus('fail-id')).rejects.toThrow('Network failure')
  })
})
