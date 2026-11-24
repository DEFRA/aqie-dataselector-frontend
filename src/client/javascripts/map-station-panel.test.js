/**
 * @jest-environment jsdom
 */

import { createStationPanelController } from './map-station-panel.js'

const station = {
  name: 'Birmingham A4540 Roadside',
  localSiteID: 'BIRR',
  stationStatus: 'Current',
  location: { coordinates: [52.476145, -1.874978] }
}

function showPanel(daqiContext, stationOverrides = {}) {
  document.body.innerHTML = `
    <div id="station-panel" tabindex="-1">
      <h2 id="sp-name"></h2>
      <dl id="sp-details"></dl>
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
