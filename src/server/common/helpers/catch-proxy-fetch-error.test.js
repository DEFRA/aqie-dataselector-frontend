const mockLogger = { info: jest.fn(), error: jest.fn() }

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => mockLogger
}))

jest.mock('~/src/server/common/helpers/proxy.js', () => ({
  proxyFetch: jest.fn()
}))

const { proxyFetch } = jest.requireMock('~/src/server/common/helpers/proxy.js')
const { catchProxyFetchError } = jest.requireActual(
  './catch-proxy-fetch-error.js'
)

const URL = 'https://example.test/api'

describe('catchProxyFetchError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the status code and JSON data for a successful response', async () => {
    proxyFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [1] })
    })

    await expect(catchProxyFetchError(URL, {})).resolves.toEqual([
      200,
      { data: [1] }
    ])
  })

  it('returns an error for a non-OK response', async () => {
    proxyFetch.mockResolvedValue({ ok: false, status: 500 })

    const [error] = await catchProxyFetchError(URL, {})

    expect(error.message).toBe(`HTTP error! status from ${URL}: 500`)
  })

  it('logs the code and message of the underlying cause', async () => {
    const cause = Object.assign(new Error('Proxy response (403) !== 200'), {
      code: 'UND_ERR_ABORTED'
    })
    proxyFetch.mockRejectedValue(new TypeError('fetch failed', { cause }))

    const [error] = await catchProxyFetchError(URL, {})

    expect(error.message).toBe('fetch failed')
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed to proxyFetch data from ${URL}: fetch failed (cause: UND_ERR_ABORTED Proxy response (403) !== 200)`
    )
  })

  it('logs a cause that has no code or message', async () => {
    proxyFetch.mockRejectedValue(
      new TypeError('fetch failed', { cause: 'socket closed' })
    )

    await catchProxyFetchError(URL, {})

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed to proxyFetch data from ${URL}: fetch failed (cause: socket closed)`
    )
  })

  it('logs only the message when there is no cause', async () => {
    proxyFetch.mockRejectedValue(new Error('boom'))

    await catchProxyFetchError(URL, {})

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed to proxyFetch data from ${URL}: boom`
    )
  })
})
