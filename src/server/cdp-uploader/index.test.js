import { cdpUploader } from './index.js'

jest.mock('./controllers/basic-upload-form.js', () => ({
  basicUploadFormGetController: {
    handler: jest.fn()
  },
  basicUploadFormPostController: {
    options: { payload: { multipart: true } },
    handler: jest.fn()
  }
}))
jest.mock('./controllers/basic-upload-complete.js', () => ({
  baseUploadCompleteController: {
    options: {},
    handler: jest.fn()
  },
  cdpUploaderCompleteController: {
    options: {},
    handler: jest.fn()
  }
}))

describe('cdpUploader plugin', () => {
  it('has the correct plugin name', () => {
    expect(cdpUploader.plugin.name).toBe('cdp-uploader')
  })

  it('registers exactly 4 routes', () => {
    const routeCalls = []
    const mockServer = {
      route: jest.fn((routes) => routeCalls.push(...routes))
    }

    cdpUploader.plugin.register(mockServer)

    expect(mockServer.route).toHaveBeenCalledTimes(1)
    expect(routeCalls).toHaveLength(4)
  })

  it('registers GET /Uploader route', () => {
    const routes = []
    const mockServer = { route: jest.fn((r) => routes.push(...r)) }

    cdpUploader.plugin.register(mockServer)

    const getUploader = routes.find(
      (r) => r.method === 'GET' && r.path === '/Uploader'
    )
    expect(getUploader).toBeDefined()
  })

  it('registers POST /Uploader route', () => {
    const routes = []
    const mockServer = { route: jest.fn((r) => routes.push(...r)) }

    cdpUploader.plugin.register(mockServer)

    const postUploader = routes.find(
      (r) => r.method === 'POST' && r.path === '/Uploader'
    )
    expect(postUploader).toBeDefined()
  })

  it('registers GET /Uploader/complete route', () => {
    const routes = []
    const mockServer = { route: jest.fn((r) => routes.push(...r)) }

    cdpUploader.plugin.register(mockServer)

    const completeRoute = routes.find(
      (r) => r.method === 'GET' && r.path === '/Uploader/complete'
    )
    expect(completeRoute).toBeDefined()
  })

  it('registers GET /Uploader/status route', () => {
    const routes = []
    const mockServer = { route: jest.fn((r) => routes.push(...r)) }

    cdpUploader.plugin.register(mockServer)

    const statusRoute = routes.find(
      (r) => r.method === 'GET' && r.path === '/Uploader/status'
    )
    expect(statusRoute).toBeDefined()
  })

  it('all routes have a handler function', () => {
    const routes = []
    const mockServer = { route: jest.fn((r) => routes.push(...r)) }

    cdpUploader.plugin.register(mockServer)

    routes.forEach((route) => {
      expect(typeof route.handler).toBe('function')
    })
  })
})
