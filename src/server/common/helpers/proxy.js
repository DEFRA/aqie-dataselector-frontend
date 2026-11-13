import { URL } from 'node:url'
import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

// undici 8 (and Node 26's bundled fetch) negotiate HTTP/2 by default. Some
// upstreams (e.g. the LAQM portal) fail over h2 with
// "ERR_HTTP2_ERROR Protocol error", so pin outbound requests to HTTP/1.1.
const directAgent = new Agent({ allowH2: false })

/**
 * @typedef Proxy
 * @property {URL} url
 * @property {number} port
 * @property {ProxyAgent} proxyAgent
 * @property {HttpsProxyAgent<string>} httpAndHttpsProxyAgent
 */

/**
 * Provide ProxyAgent and HttpsProxyAgent when http/s proxy url config has been set
 * @returns {Proxy|null}
 */
function provideProxy() {
  const proxyUrl = config.get('httpsProxy') ?? config.get('httpProxy')

  if (!proxyUrl) {
    return null
  }

  const url = new URL(proxyUrl)
  const httpPort = 80
  const httpsPort = 443
  // The url.protocol value always has a colon at the end
  const port = url.protocol.toLowerCase() === 'http:' ? httpPort : httpsPort

  logger.debug(`Proxy set up using ${url.origin}:${port}`)

  return {
    url,
    port,
    proxyAgent: new ProxyAgent({
      uri: proxyUrl,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
      allowH2: false
    }),
    httpAndHttpsProxyAgent: new HttpsProxyAgent(url)
  }
}

/**
 * Provide fetch with dispatcher ProxyAgent when http/s proxy url config has been set
 * @param {string | URL } url
 * @param {RequestInit} options
 * @returns {Promise}
 */
function proxyFetch(url, options) {
  const proxy = provideProxy()

  if (!proxy) {
    return undiciFetch(url, { ...options, dispatcher: directAgent })
  }

  logger.debug(
    `Fetching: ${url.toString()} via the proxy: ${proxy?.url.origin}:${proxy.port}`
  )

  // Use undici's own fetch with its ProxyAgent. Node's built-in fetch bundles
  // its own undici version (8.x on Node 26), which rejects a ProxyAgent from
  // the npm undici package with "fetch failed: invalid onError method".
  return undiciFetch(url, {
    ...options,
    dispatcher: proxy.proxyAgent
  })
}

export { proxyFetch, provideProxy }
