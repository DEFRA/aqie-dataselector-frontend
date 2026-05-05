import { basicUploadFormController } from './basic-upload-form.js'
import { config } from '~/src/config/config.js'
import { TEST_TIMEOUT_MS } from '~/src/server/common/constants/magic-numbers.js'

import { initUpload, getAllowedAnalysisTypes } from '../helper/init-upload.js'
import fs from 'fs'

jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))
jest.mock('~/src/server/cdp-uploader/helper/init-upload.js', () => ({
  initUpload: jest.fn(),
  getAllowedAnalysisTypes: jest.fn()
}))
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn()
}))

const mockUser = { id: 'user-1', email: 'user@example.com' }

function buildRequest(overrides = {}) {
  return {
    method: 'get',
    query: {},
    payload: null,
    auth: {
      isAuthenticated: true,
      credentials: { user: mockUser }
    },
    yar: {
      clear: jest.fn(),
      get: jest.fn(),
      set: jest.fn()
    },
    ...overrides
  }
}

function buildH() {
  return {
    view: jest.fn().mockReturnValue('view-response'),
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnValue('redirect-response')
  }
}

const mockSecureUpload = {
  uploadUrl: 'https://cdp-uploader.example.com/upload/form',
  statusUrl: 'https://cdp-uploader.example.com/status/abc'
}

beforeEach(() => {
  jest.clearAllMocks()
  config.get.mockImplementation((key) => {
    const values = {
      'aws.s3BucketName': 'dev-test-bucket',
      analysisTypeMapping: {
        red: [],
        green: ['user@example.com'],
        icb: [],
        eb: []
      }
    }
    return values[key]
  })
  initUpload.mockResolvedValue(mockSecureUpload)
  getAllowedAnalysisTypes.mockReturnValue([
    { key: 'green', label: 'Green book' },
    { key: 'comparingTwoDocuments', label: 'Compare two documents' }
  ])
  fs.existsSync.mockReturnValue(false)
})

describe('basicUploadFormController — GET', () => {
  it(
    'renders the upload form with uploadUrl and user info',
    async () => {
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'cdp-uploader/views/basic-upload-form',
        expect.objectContaining({
          isAuthenticated: true,
          user: mockUser,
          action: mockSecureUpload.uploadUrl
        })
      )
    },
    TEST_TIMEOUT_MS
  )

  it(
    'stores statusUrl in session for authenticated user',
    async () => {
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith('basic-upload', {
        statusUrl: mockSecureUpload.statusUrl
      })
    },
    TEST_TIMEOUT_MS
  )

  it(
    'clears basic-upload session before processing',
    async () => {
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.clear).toHaveBeenCalledWith('basic-upload')
    },
    TEST_TIMEOUT_MS
  )

  it(
    'passes allowedAnalysisTypes to the view',
    async () => {
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'cdp-uploader/views/basic-upload-form',
        expect.objectContaining({
          allowedAnalysisTypes: expect.any(Array)
        })
      )
    },
    TEST_TIMEOUT_MS
  )
})

describe('basicUploadFormController — POST', () => {
  it(
    'stores analysisType in session from payload',
    async () => {
      const request = buildRequest({
        method: 'post',
        payload: { analysisType: 'green' }
      })
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith('analysisType', {
        analysisType: 'green'
      })
    },
    TEST_TIMEOUT_MS
  )

  it(
    'stores compareData in session when isCompare is true',
    async () => {
      const request = buildRequest({
        method: 'post',
        payload: {
          isCompare: 'true',
          concatenatedFilename: 'file1.pdf -> file2.pdf',
          compareS3Bucket: 'my-bucket',
          compareS3Key: 'keys/file1.pdf',
          compareUploadId: 'upload-99'
        }
      })
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith(
        'compareData',
        expect.objectContaining({
          s3Bucket: 'my-bucket',
          s3Key: 'keys/file1.pdf',
          uploadId: 'upload-99',
          isCompare: true
        })
      )
    },
    TEST_TIMEOUT_MS
  )

  it(
    'uses "Unknown vs Unknown" when concatenatedFilename is missing in compare',
    async () => {
      const request = buildRequest({
        method: 'post',
        payload: {
          isCompare: 'true',
          concatenatedFilename: '',
          compareS3Bucket: 'my-bucket',
          compareS3Key: 'keys/file.pdf',
          compareUploadId: 'upload-77'
        }
      })
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith(
        'compareData',
        expect.objectContaining({ concatenatedFilename: 'Unknown vs Unknown' })
      )
    },
    TEST_TIMEOUT_MS
  )

  it(
    'defaults analysisType to empty string when not in payload',
    async () => {
      const request = buildRequest({
        method: 'post',
        payload: {}
      })
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith('analysisType', {
        analysisType: ''
      })
    },
    TEST_TIMEOUT_MS
  )
})

describe('basicUploadFormController — config error handling', () => {
  it(
    'returns 500 when aws.s3BucketName is not configured',
    async () => {
      config.get.mockImplementation((key) => {
        if (key === 'aws.s3BucketName') return null
        return undefined
      })
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({ error: 'Configuration error' })
      expect(h.code).toHaveBeenCalledWith(500)
    },
    TEST_TIMEOUT_MS
  )

  it(
    'returns 500 when analysisTypeMapping is not configured',
    async () => {
      config.get.mockImplementation((key) => {
        if (key === 'aws.s3BucketName') return 'dev-test-bucket'
        if (key === 'analysisTypeMapping') return null
        return undefined
      })
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({ error: 'Configuration error' })
      expect(h.code).toHaveBeenCalledWith(500)
    },
    TEST_TIMEOUT_MS
  )

  it(
    'returns 500 when initUpload throws',
    async () => {
      initUpload.mockRejectedValue(new Error('Uploader service unavailable'))
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        error: 'Upload initialization failed'
      })
      expect(h.code).toHaveBeenCalledWith(500)
    },
    TEST_TIMEOUT_MS
  )
})

describe('basicUploadFormController — user uploads queue', () => {
  it(
    'passes empty uploads array when queue file does not exist',
    async () => {
      fs.existsSync.mockReturnValue(false)
      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'cdp-uploader/views/basic-upload-form',
        expect.objectContaining({ uploads: [] })
      )
    },
    TEST_TIMEOUT_MS
  )

  it(
    'filters uploads by userId and passes to view',
    async () => {
      fs.existsSync.mockReturnValue(true)
      const uploads = [
        [
          'id-1',
          {
            userId: 'user-1',
            timestamp: '2024-01-02T00:00:00Z',
            filename: 'a.pdf'
          }
        ],
        [
          'id-2',
          {
            userId: 'other-user',
            timestamp: '2024-01-01T00:00:00Z',
            filename: 'b.pdf'
          }
        ]
      ]
      fs.readFileSync.mockReturnValue(JSON.stringify(uploads))

      const request = buildRequest()
      const h = buildH()

      await basicUploadFormController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'cdp-uploader/views/basic-upload-form',
        expect.objectContaining({
          uploads: [expect.objectContaining({ userId: 'user-1' })]
        })
      )
    },
    TEST_TIMEOUT_MS
  )
})
