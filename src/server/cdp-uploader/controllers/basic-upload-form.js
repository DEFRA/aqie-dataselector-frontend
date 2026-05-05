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
    const file = request.payload?.policyPdf
    if (!file?._data || file._data.length === 0) {
      return h.view('cdp-uploader/views/basic-upload-form', {
        uploads: loadUploads(),
        error: 'Please select a file to upload.'
      })
    }

    const filename = file.hapi?.filename || `upload-${Date.now()}`
    const contentType =
      file.hapi?.headers?.['content-type'] || 'application/octet-stream'
    const s3Bucket = config.get('aws.s3BucketName')
    const s3Key = `uploads/${Date.now()}-${filename}`

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: file._data,
          ContentType: contentType
        })
      )

      saveUpload({
        id: `upload_${Date.now()}`,
        filename,
        s3Key,
        s3Bucket,
        timestamp: new Date().toISOString()
      })

      return h.redirect('/Uploader?uploaded=true')
    } catch (err) {
      logger.error('S3 upload faileds:', err)
      return h.view('cdp-uploader/views/basic-upload-form', {
        uploads: loadUploads(),
        error: `Upload failed: ${err.message}`
      })
    }
  }
}

export { basicUploadFormGetController, basicUploadFormPostController }
