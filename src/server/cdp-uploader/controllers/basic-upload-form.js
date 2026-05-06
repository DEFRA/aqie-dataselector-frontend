import { config } from '../../../config/config.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { s3Client } from '../../common/helpers/s3-client.js'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const logger = createLogger()

function loadUploads() {
  const queueFile = path.join(process.cwd(), 'upload-queue.json')
  try {
    if (fs.existsSync(queueFile)) {
      const parsed = JSON.parse(fs.readFileSync(queueFile, 'utf8'))
      if (Array.isArray(parsed)) {
        return Array.from(new Map(parsed).values()).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      }
    }
  } catch (err) {
    logger.error('Error loading uploads:', err)
  }
  return []
}

function saveUpload(entry) {
  const queueFile = path.join(process.cwd(), 'upload-queue.json')
  try {
    const existing = (() => {
      if (fs.existsSync(queueFile)) {
        const parsed = JSON.parse(fs.readFileSync(queueFile, 'utf8'))
        return Array.isArray(parsed) ? new Map(parsed) : new Map()
      }
      return new Map()
    })()
    existing.set(entry.id, entry)
    fs.writeFileSync(queueFile, JSON.stringify([...existing]))
  } catch (err) {
    logger.error('Error saving upload:', err)
  }
}

const basicUploadFormGetController = {
  handler: (request, h) => {
    const success = request.query.uploaded === 'true'
    return h.view('cdp-uploader/views/basic-upload-form', {
      uploads: loadUploads(),
      success
    })
  }
}

const basicUploadFormPostController = {
  options: {
    payload: {
      multipart: true,
      output: 'data',
      maxBytes: 100 * 1024 * 1024
    }
  },
  handler: async (request, h) => {
    logger.info('[STEP 1] POST /Uploader handler triggered')

    const payload = request.payload
    logger.info(
      { payloadKeys: payload ? Object.keys(payload) : null },
      '[STEP 2] request.payload keys'
    )

    const file = payload?.policyPdf
    // Hapi v21 with output:'data' returns the file as a raw Buffer, not {_data, hapi}
    const fileData = Buffer.isBuffer(file) ? file : file?._data
    logger.info(
      {
        fileType: typeof file,
        isBuffer: Buffer.isBuffer(file),
        fileDataLength: fileData?.length
      },
      '[STEP 2] file payload inspection'
    )

    if (!fileData || fileData.length === 0) {
      logger.info('[STEP 3] VALIDATION FAILED — no file data received')
      return h.view('cdp-uploader/views/basic-upload-form', {
        uploads: loadUploads(),
        error: 'Please select a file to upload.'
      })
    }
    logger.info(
      { dataLength: fileData.length },
      '[STEP 3] Validation passed — file data present'
    )

    const filename = file?.hapi?.filename || `upload-${Date.now()}`
    const contentType =
      file?.hapi?.headers?.['content-type'] || 'application/octet-stream'
    const s3Bucket = config.get('aws.s3BucketName')
    const s3Key = `uploads/${Date.now()}-${filename}`
    logger.info(
      { filename, contentType, s3Bucket, s3Key },
      '[STEP 4] File metadata extracted'
    )

    try {
      logger.info({ s3Bucket, s3Key }, '[STEP 5] Attempting S3 PutObject')

      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: fileData,
          ContentType: contentType
        })
      )

      logger.info({ s3Bucket, s3Key }, '[STEP 6] S3 upload succeeded')

      const uploadEntry = {
        id: `upload_${Date.now()}`,
        filename,
        s3Key,
        s3Bucket,
        timestamp: new Date().toISOString()
      }
      logger.info(uploadEntry, '[STEP 7] Saving upload record to queue')
      saveUpload(uploadEntry)

      logger.info('[STEP 8] Redirecting to /Uploader?uploaded=true')
      return h.redirect('/Uploader?uploaded=true')
    } catch (err) {
      logger.error(
        { err: err.message, stack: err.stack, s3Bucket, s3Key },
        '[STEP 5] S3 upload FAILED'
      )
      return h.view('cdp-uploader/views/basic-upload-form', {
        uploads: loadUploads(),
        error: `Upload failed: ${err.message}`
      })
    }
  }
}

export { basicUploadFormGetController, basicUploadFormPostController }
