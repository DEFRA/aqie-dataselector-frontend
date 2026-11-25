/**
 * @jest-environment jsdom
 */

import nunjucks from 'nunjucks'

import { createStationPanelController } from './map-station-panel.js'

const station = {
  name: 'Birmingham A4540 Roadside',
  localSiteID: 'BIRR',
  stationStatus: 'Current',
  location: { coordinates: [52.476145, -1.874978] }
}

function showPanel(daqiContext, stationOverrides = {}) {
  document.body.innerHTML = `
    <div id="station-panel" tabindex="-1" data-dataselector-url="">
      <div id="sp-heading"></div>
      <dl id="sp-details"></dl>
      <form id="sp-station-form" method="post">
        <input type="hidden" name="lat">
        <input type="hidden" name="lng">
        <input type="hidden" name="name">
      </form>
      <a href="#" id="sp-station-link" hidden>View full station summary</a>
    </div>`
  const controller = createStationPanelController({
    map: { addMarker: jest.fn() },
    getSortedStations: () => [],
    getDaqiContext: () => ({
      forecasts: [],
      selectedForecastDay: 'today',
      ...daqiContext
    })
  })
  controller.showStationPanel({ ...station, ...stationOverrides })
  return document.querySelector('#sp-name .aq-station-tag')
}

describe('station panel status tag', () => {
  it('shows Inactive for a grey marker with no current reading', () => {
    const tag = showPanel({ mapMode: 'aurn', aurnDataByStation: new Map() })

    expect(tag.textContent).toBe('Inactive')
    expect(tag.classList.contains('aq-station-tag--inactive')).toBe(true)
  })

  it('shows Active when the station has a current reading', () => {
    const tag = showPanel({
      mapMode: 'aurn',
      aurnDataByStation: new Map([['BIRR', 3]])
    })

    expect(tag.textContent).toBe('Active')
    expect(tag.classList.contains('aq-station-tag--active')).toBe(true)
  })

  it('shows Active on the forecast view, where grey only means no forecast', () => {
    const tag = showPanel({ mapMode: 'forecast', aurnDataByStation: new Map() })

    expect(tag.textContent).toBe('Active')
  })

  it('still shows Closed for a closed station', () => {
    const tag = showPanel(
      { mapMode: 'aurn', aurnDataByStation: new Map() },
      { stationStatus: 'Closed' }
    )

    expect(tag.textContent).toBe('Closed')
    expect(tag.classList.contains('aq-station-tag--closed')).toBe(true)
  })
})

describe('View full station summary link', () => {
  const link = () => document.getElementById('sp-station-link')

  it('is shown for an active station', () => {
    showPanel({ mapMode: 'aurn', aurnDataByStation: new Map([['BIRR', 3]]) })

    expect(link().hidden).toBe(false)
  })

  it('is hidden for an inactive station', () => {
    showPanel({ mapMode: 'aurn', aurnDataByStation: new Map() })

    expect(link().hidden).toBe(true)
  })

  it('is hidden for a closed station', () => {
    showPanel(
      { mapMode: 'aurn', aurnDataByStation: new Map([['BIRR', 3]]) },
      { stationStatus: 'Closed' }
    )

    expect(link().hidden).toBe(true)
  })
})

describe('station panel heading', () => {
  it('has no empty heading before a station is selected', () => {
    const html = nunjucks
      .configure('src/server/common/templates')
      .render('partials/station-panel.njk', { dataSelectorUrl: '' })
    document.body.innerHTML = html

    expect(document.querySelectorAll('#station-panel h2')).toHaveLength(0)
  })

  it('adds a single heading each time a station is selected', () => {
    const context = { mapMode: 'aurn', aurnDataByStation: new Map() }
    showPanel(context)
    const controller = createStationPanelController({
      map: { addMarker: jest.fn() },
      getSortedStations: () => [],
      getDaqiContext: () => ({ forecasts: [], ...context })
    })
    controller.showStationPanel({ ...station, name: 'York Bootham' })

    const headings = document.querySelectorAll('#sp-heading h2')
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe('York Bootham Inactive')
  })
})
