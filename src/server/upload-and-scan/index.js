import { uploadController } from '~/src/server/upload-and-scan/controller.js'
import {
  basicUploadFormGetController,
  basicUploadFormPostController
} from '~/src/server/cdp-uploader/controllers/basic-upload-form.js'
import {
  baseUploadCompleteController,
  cdpUploaderCompleteController
} from '~/src/server/cdp-uploader/controllers/basic-upload-complete.js'

const uploadAndScan = {
  plugin: {
    name: 'upload-and-scan',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/Uploader',
          ...basicUploadFormGetController
        },
        {
          method: 'POST',
          path: '/Uploader',
          ...basicUploadFormPostController
        },
        {
          method: 'GET',
          path: '/Uploader/complete',
          ...baseUploadCompleteController
        },
        {
          method: 'GET',
          path: '/Uploader/status',
          ...cdpUploaderCompleteController
        },
        {
          method: 'POST',
          path: '/upload-and-scan/{uploadId}',
          ...uploadController
        }
      ])
    }
  }
}

export { uploadAndScan }
