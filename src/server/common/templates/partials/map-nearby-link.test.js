import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')

function render(context) {
  const env = nunjucks.configure([templates], {
    autoescape: true,
    noCache: true
  })
  return cheerio.load(env.render('partials/map-nearby-link.njk', context))
}

const stationdetails = {
  localSiteID: 'MY1',
  location: { coordinates: [51.52253, -0.154611] }
}

describe('map-nearby-link.njk', () => {
  it('renders nothing when mapViewUrl is not set', () => {
    const $ = render({ mapViewUrl: null, stationdetails })

    expect($('form')).toHaveLength(0)
  })

  it('renders nothing when the station has no coordinates', () => {
    const $ = render({
      mapViewUrl: 'https://maps.example/map/view',
      stationdetails: { localSiteID: 'MY1' }
    })

    expect($('form')).toHaveLength(0)
  })

  it('posts the station location and id to the map view', () => {
    const $ = render({
      mapViewUrl: 'https://maps.example/map/view',
      stationdetails
    })

    const form = $('form')
    expect(form.attr('method')).toBe('post')
    expect(form.attr('action')).toBe('https://maps.example/map/view')
    expect($('input[name="lat"]').val()).toBe('51.52253')
    expect($('input[name="lng"]').val()).toBe('-0.154611')
    expect($('input[name="siteId"]').val()).toBe('MY1')
    expect($('button[type="submit"]').text().trim()).toBe(
      'View map of nearby monitoring stations'
    )
  })

  it('omits siteId when the station has no local site id', () => {
    const $ = render({
      mapViewUrl: 'https://maps.example/map/view',
      stationdetails: { location: stationdetails.location }
    })

    expect($('input[name="siteId"]')).toHaveLength(0)
    expect($('input[name="lat"]')).toHaveLength(1)
  })
})
