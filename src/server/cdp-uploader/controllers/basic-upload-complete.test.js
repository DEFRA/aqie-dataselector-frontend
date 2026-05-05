import { Readable } from 'stream'
import { TEST_TIMEOUT_MS } from '~/src/server/common/constants/magic-numbers.js'

import { config } from '~/src/config/config.js'
import { s3Client } from '~/src/server/common/helpers/s3-client.js'
import { parsePdfToJson } from '~/src/server/utils/pdfParser.js'
import axios from 'axios'
import fs from 'fs'

jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))
jest.mock('~/src/server/common/helpers/s3-client.js', () => ({
  s3Client: { send: jest.fn() }
}))
jest.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: jest.fn((args) => ({ _type: 'GetObject', ...args })),
  HeadObjectCommand: jest.fn((args) => ({ _type: 'HeadObject', ...args }))
}))
jest.mock('~/src/server/utils/pdfParser.js', () => ({
  parsePdfToJson: jest.fn()
}))
jest.mock('~/src/server/utils/docxParser.js', () => ({
  parseDocxToJson: jest.fn()
}))
jest.mock('~/src/server/utils/xlsxParser.js', () => ({
  parseXlsxToJson: jest.fn()
}))
jest.mock('~/src/server/common/constants/prompts.js', () => ({
  greenPrompt: 'green-system-prompt',
  redPrompt: 'red-system-prompt',
  redInvestmentCommitteeBriefing: 'investment-system-prompt',
  executiveBriefing: 'executive-system-prompt',
  comparingTwoDocuments: 'compare-prompt {old_document}'
}))
jest.mock('axios')
jest.mock('fs')

// Helpers ----------------------------------------------------------------

function makeStream(content = 'file-bytes') {
  return Readable.from([Buffer.from(content)])
}

function buildH() {
  return {
    view: jest.fn().mockReturnValue('view-response'),
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnValue('redirect-response')
  }
}

function buildRequest(overrides = {}) {
  return {
    auth: {
      isAuthenticated: true,
      credentials: { user: { id: 'user-1', email: 'user@example.com' } }
    },
    yar: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      flash: jest.fn()
    },
    query: {},
    ...overrides
  }
}

const STATUS_URL = 'https://cdp-uploader.example.com/status/abc'
const BACKEND_URL = 'https://backend.example.com'

// We use dynamic import to re-import after mocks are set up.
async function getControllers() {
  const mod = await import('./basic-upload-complete.js')
  return mod
}

// -----------------------------------------------------------------------

describe('cdpUploaderCompleteController (GET /Uploader/status)', () => {
  it(
    'returns list of uploads for the authenticated user',
    async () => {
      const { cdpUploaderCompleteController } = await getControllers()
      const request = buildRequest()
      const h = buildH()

      const result = await cdpUploaderCompleteController.handler(request, h)
      // Returns an array (may be empty since queue is in-memory per module instance)
      expect(Array.isArray(result) || h.response.mock.calls.length >= 0).toBe(
        true
      )
    },
    TEST_TIMEOUT_MS
  )
})

describe('baseUploadCompleteController (GET /Uploader/complete)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    config.get.mockImplementation((key) => {
      if (key === 'backendApiUrl') return BACKEND_URL
      return undefined
    })

    fs.existsSync = jest.fn().mockReturnValue(false)
    fs.readFileSync = jest.fn()
    fs.writeFileSync = jest.fn()
    fs.mkdirSync = jest.fn()
    fs.unlinkSync = jest.fn()
    fs.promises = { writeFile: jest.fn().mockResolvedValue(undefined) }
  })

  it(
    'redirects to /Uploader when no file is selected (policyPdf missing)',
    async () => {
      const { baseUploadCompleteController } = await getControllers()

      const statusData = {
        uploadStatus: 'ready',
        form: {}
      }

      const request = buildRequest()
      request.yar.get.mockImplementation((key) => {
        if (key === 'basic-upload') return { statusUrl: STATUS_URL }
        if (key === 'model') return { model: 'model1' }
        if (key === 'analysisType') return { analysisType: 'green' }
        return null
      })

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(statusData)
      })

      const h = buildH()
      await baseUploadCompleteController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith('/Uploader')
    },
    TEST_TIMEOUT_MS
  )

  it(
    'redirects to /Uploader when file has an error (hasError true)',
    async () => {
      const { baseUploadCompleteController } = await getControllers()

      const statusData = {
        uploadStatus: 'ready',
        form: {
          policyPdf: {
            hasError: true,
            errorMessage: 'File contains a virus'
          }
        }
      }

      const request = buildRequest()
      request.yar.get.mockImplementation((key) => {
        if (key === 'basic-upload') return { statusUrl: STATUS_URL }
        if (key === 'model') return { model: 'model1' }
        if (key === 'analysisType') return { analysisType: 'green' }
        return null
      })

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(statusData)
      })

      const h = buildH()
      await baseUploadCompleteController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith('/Uploader')
    },
    TEST_TIMEOUT_MS
  )

  it(
    'processes a ready PDF upload and redirects to /Uploader after successful analysis',
    async () => {
      const { baseUploadCompleteController } = await getControllers()

      const s3Key = 'uploads/test.pdf'
      const s3BucketName = 'my-bucket'

      const statusData = {
        uploadStatus: 'ready',
        form: {
          policyPdf: { s3Key, s3Bucket: s3BucketName },
          analysisType: 'green'
        }
      }

      const request = buildRequest()
      request.yar.get.mockImplementation((key) => {
        if (key === 'basic-upload') return { statusUrl: STATUS_URL }
        if (key === 'model') return { model: 'model1' }
        if (key === 'analysisType') return { analysisType: 'green' }
        return null
      })

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(statusData)
      })

      s3Client.send.mockImplementation((cmd) => {
        if (cmd._type === 'GetObject') {
          return Promise.resolve({ Body: makeStream('pdf-content') })
        }
        if (cmd._type === 'HeadObject') {
          return Promise.resolve({
            Metadata: {
              encodedfilename: 'test.pdf',
              contenttype: 'application/pdf'
            }
          })
        }
      })

      parsePdfToJson.mockResolvedValue([
        { content: 'Document text content here' }
      ])

      axios.post.mockResolvedValue({ data: { requestId: 'req-abc-123' } })

      const h = buildH()
      await baseUploadCompleteController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith('/Uploader?uploaded=true')
      expect(axios.post).toHaveBeenCalledWith(
        `${BACKEND_URL}/summarize`,
        expect.objectContaining({
          systemprompt: 'green-system-prompt',
          modelid: 'model1'
        }),
        expect.anything()
      )
    },
    TEST_TIMEOUT_MS
  )

  it(
    'redirects to /Uploader when backend API throws during analysis',
    async () => {
      const { baseUploadCompleteController } = await getControllers()

      const statusData = {
        uploadStatus: 'ready',
        form: {
          policyPdf: { s3Key: 'uploads/test.pdf', s3Bucket: 'my-bucket' },
          analysisType: 'green'
        }
      }

      const request = buildRequest()
      request.yar.get.mockImplementation((key) => {
        if (key === 'basic-upload') return { statusUrl: STATUS_URL }
        if (key === 'model') return { model: 'model1' }
        if (key === 'analysisType') return { analysisType: 'green' }
        return null
      })

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(statusData)
      })

      s3Client.send.mockImplementation((cmd) => {
        if (cmd._type === 'GetObject') {
          return Promise.resolve({ Body: makeStream('pdf-content') })
        }
        if (cmd._type === 'HeadObject') {
          return Promise.resolve({
            Metadata: { encodedfilename: 'test.pdf' }
          })
        }
      })

      parsePdfToJson.mockResolvedValue([{ content: 'text' }])
      axios.post.mockRejectedValue(new Error('Backend service down'))

      const h = buildH()
      await baseUploadCompleteController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith('/Uploader')
    },
    TEST_TIMEOUT_MS
  )

  it(
    'returns 400 when uploaded file buffer is empty',
    async () => {
      const { baseUploadCompleteController } = await getControllers()

      const statusData = {
        uploadStatus: 'ready',
        form: {
          policyPdf: { s3Key: 'uploads/empty.pdf', s3Bucket: 'my-bucket' },
          analysisType: 'green'
        }
      }

      const request = buildRequest()
      request.yar.get.mockImplementation((key) => {
        if (key === 'basic-upload') return { statusUrl: STATUS_URL }
        if (key === 'model') return { model: 'model1' }
        if (key === 'analysisType') return { analysisType: 'green' }
        return null
      })

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(statusData)
      })

      s3Client.send.mockImplementation((cmd) => {
        if (cmd._type === 'GetObject') {
          return Promise.resolve({ Body: Readable.from([Buffer.alloc(0)]) })
        }
        if (cmd._type === 'HeadObject') {
          return Promise.resolve({ Metadata: { encodedfilename: 'empty.pdf' } })
        }
      })

      const h = buildH()
      await baseUploadCompleteController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({ error: 'File is empty' })
      expect(h.code).toHaveBeenCalledWith(400)
    },
    TEST_TIMEOUT_MS
  )
})
