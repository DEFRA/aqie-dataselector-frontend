import { config } from '~/src/config/config.js'
import {
  getMapUrl,
  getMapUrlIfEnabled,
  getMapReturnUrl
} from '~/src/server/common/helpers/map-url.js'

const requestWith = (session) => ({
  yar: { get: (key) => session[key] }
})

describe('map-url helpers', () => {
  const originalUrl = config.get('mapsFrontEnd.url')
  const originalFlag = config.get('featureFlags.searchOnMap')

  afterEach(() => {
    config.set('mapsFrontEnd.url', originalUrl)
    config.set('featureFlags.searchOnMap', originalFlag)
  })

  describe('getMapUrl', () => {
    it('appends /map and strips trailing slashes', () => {
      config.set('mapsFrontEnd.url', 'https://maps.example/')
      expect(getMapUrl()).toBe('https://maps.example/map')
    })

    it('returns null when no maps URL is configured', () => {
      config.set('mapsFrontEnd.url', null)
      expect(getMapUrl()).toBeNull()
    })
  })

  describe('getMapUrlIfEnabled', () => {
    it('returns null while the feature flag is off', () => {
      config.set('mapsFrontEnd.url', 'https://maps.example')
      config.set('featureFlags.searchOnMap', false)
      expect(getMapUrlIfEnabled()).toBeNull()
    })

    it('returns the map URL when the flag is on', () => {
      config.set('mapsFrontEnd.url', 'https://maps.example')
      config.set('featureFlags.searchOnMap', true)
      expect(getMapUrlIfEnabled()).toBe('https://maps.example/map')
    })
  })

  describe('getMapReturnUrl', () => {
    beforeEach(() => {
      config.set('mapsFrontEnd.url', 'https://maps.example')
    })

    it('returns the map URL when the marker matches the current station', () => {
      const request = requestWith({ mapReturnSiteId: 'ABC', SiteId: 'ABC' })
      expect(getMapReturnUrl(request)).toBe('https://maps.example/map')
    })

    it('returns null when there is no marker', () => {
      expect(getMapReturnUrl(requestWith({ SiteId: 'ABC' }))).toBeNull()
    })

    it('returns null when the marker is for a different station', () => {
      const request = requestWith({ mapReturnSiteId: 'ABC', SiteId: 'XYZ' })
      expect(getMapReturnUrl(request)).toBeNull()
    })

    it('returns null when no maps URL is configured', () => {
      config.set('mapsFrontEnd.url', null)
      const request = requestWith({ mapReturnSiteId: 'ABC', SiteId: 'ABC' })
      expect(getMapReturnUrl(request)).toBeNull()
    })
  })
})
