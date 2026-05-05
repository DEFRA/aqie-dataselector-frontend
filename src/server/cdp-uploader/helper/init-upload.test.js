import { initUpload, getAllowedAnalysisTypes } from './init-upload.js'
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

describe('initUpload', () => {
  it('posts to /initiate with correct body and returns parsed JSON', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        uploadUrl: 'https://upload.example.com/upload',
        statusUrl: 'https://upload.example.com/status/abc'
      })
    }
    fetch.mockResolvedValue(mockResponse)

    const result = await initUpload({
      redirect: '/Uploader/complete',
      s3Bucket: 'my-bucket'
    })

    expect(fetch).toHaveBeenCalledWith(
      `${UPLOADER_URL}/initiate`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"redirect":"/Uploader/complete"')
      })
    )

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(sentBody).toMatchObject({
      redirect: '/Uploader/complete',
      s3Bucket: 'my-bucket',
      mimeTypes: expect.arrayContaining(['application/pdf'])
    })

    expect(result).toEqual({
      uploadUrl: 'https://upload.example.com/upload',
      statusUrl: 'https://upload.example.com/status/abc'
    })
  })

  it('includes all required mimeTypes in the request', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ uploadUrl: '', statusUrl: '' })
    }
    fetch.mockResolvedValue(mockResponse)

    await initUpload({ redirect: '/done', s3Bucket: 'bucket' })

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(sentBody.mimeTypes).toContain('application/pdf')
    expect(sentBody.mimeTypes).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(sentBody.mimeTypes).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(sentBody.mimeTypes).toContain('application/vnd.ms-excel')
  })

  it('throws when the response is not ok', async () => {
    fetch.mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      message: undefined
    })

    await expect(
      initUpload({ redirect: '/done', s3Bucket: 'bucket' })
    ).rejects.toThrow('Upload API error')
  })

  it('uses cdpUploaderUrl from config', async () => {
    const customUrl = 'https://custom-uploader.example.com'
    config.get.mockImplementation((key) => {
      if (key === 'cdpUploaderUrl') return customUrl
      return undefined
    })

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ uploadUrl: '', statusUrl: '' })
    }
    fetch.mockResolvedValue(mockResponse)

    await initUpload({ redirect: '/done', s3Bucket: 'bucket' })

    expect(fetch).toHaveBeenCalledWith(
      `${customUrl}/initiate`,
      expect.anything()
    )
  })
})

describe('getAllowedAnalysisTypes', () => {
  const mapping = {
    red: ['red@example.com', 'admin@example.com'],
    green: ['green@example.com', 'admin@example.com'],
    icb: ['icb@example.com'],
    eb: ['eb@example.com']
  }

  it('returns green type for a green email', () => {
    const result = getAllowedAnalysisTypes('green@example.com', mapping)
    expect(result).toEqual(
      expect.arrayContaining([{ key: 'green', label: expect.any(String) }])
    )
    expect(result.map((r) => r.key)).not.toContain('red')
  })

  it('returns red type for a red email', () => {
    const result = getAllowedAnalysisTypes('red@example.com', mapping)
    expect(result).toEqual(
      expect.arrayContaining([{ key: 'red', label: expect.any(String) }])
    )
    expect(result.map((r) => r.key)).not.toContain('green')
  })

  it('returns multiple types for admin email with access to red and green', () => {
    const result = getAllowedAnalysisTypes('admin@example.com', mapping)
    const keys = result.map((r) => r.key)
    expect(keys).toContain('red')
    expect(keys).toContain('green')
  })

  it('returns investment type for icb email', () => {
    const result = getAllowedAnalysisTypes('icb@example.com', mapping)
    expect(result.map((r) => r.key)).toContain('investment')
  })

  it('returns executive type for eb email', () => {
    const result = getAllowedAnalysisTypes('eb@example.com', mapping)
    expect(result.map((r) => r.key)).toContain('executive')
  })

  it('always includes comparingTwoDocuments for any user', () => {
    const result = getAllowedAnalysisTypes('anyone@example.com', mapping)
    expect(result.map((r) => r.key)).toContain('comparingTwoDocuments')
  })

  it('returns only comparingTwoDocuments for an email with no access', () => {
    const result = getAllowedAnalysisTypes('unknown@example.com', mapping)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('comparingTwoDocuments')
  })

  it('handles null email — returns only comparingTwoDocuments', () => {
    const result = getAllowedAnalysisTypes(null, mapping)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('comparingTwoDocuments')
  })

  it('handles empty mapping — returns only comparingTwoDocuments', () => {
    const result = getAllowedAnalysisTypes('red@example.com', {})
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('comparingTwoDocuments')
  })

  it('is case-insensitive for email matching', () => {
    const result = getAllowedAnalysisTypes('RED@EXAMPLE.COM', mapping)
    expect(result.map((r) => r.key)).toContain('red')
  })

  it('handles comma-separated string in mapping instead of array', () => {
    const stringMapping = {
      red: 'red@example.com,admin@example.com',
      green: [],
      icb: [],
      eb: []
    }
    const result = getAllowedAnalysisTypes('red@example.com', stringMapping)
    expect(result.map((r) => r.key)).toContain('red')
  })
})
