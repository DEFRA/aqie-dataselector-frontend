import {
  basicUploadFormGetController,
  basicUploadFormPostController
} from '../../server/cdp-uploader/controllers/basic-upload-form.js'
import {
  baseUploadCompleteController,
  cdpUploaderCompleteController
} from '../../server/cdp-uploader/controllers/basic-upload-complete.js'

const cdpUploader = {
  plugin: {
    name: 'cdp-uploader',
    register: (server) => {
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
        }
      ])
    }
  }
}

export { cdpUploader }
