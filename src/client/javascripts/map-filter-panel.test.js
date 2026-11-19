/**
 * @jest-environment jsdom
 */
import {
  filterState,
  initFilterPanel,
  applyFilterState
} from './map-filter-panel.js'

const ARIA_PRESSED = 'aria-pressed'

function buildDom() {
  document.body.innerHTML = `
    <div id="filter-panel" tabindex="-1">
      <button id="filter-panel-close"></button>
      <button id="map-type-aurn" class="aq-filter-panel__tab aq-filter-panel__tab--active" aria-pressed="true"><span>Monitoring stations</span></button>
      <button id="map-type-forecast" class="aq-filter-panel__tab" aria-pressed="false"><span>Forecast</span></button>
      <div id="pollutant-filter-controls">
        <button id="filter-tab-daqi" class="aq-filter-panel__tab aq-filter-panel__tab--active" aria-pressed="true"><span>DAQI pollutants</span></button>
        <button id="filter-tab-other" class="aq-filter-panel__tab" aria-pressed="false"><span>Other pollutants</span></button>
        <div class="aq-filter-panel__scroll">
          <div id="filter-daqi-content"></div>
          <div id="filter-other-content" hidden></div>
        </div>
      </div>
      <div id="forecast-day-controls" hidden></div>
    </div>
  `
}

describe('map-filter-panel — map type toggle', () => {
  let onFilterChange

  beforeEach(() => {
    buildDom()
    onFilterChange = jest.fn()
    filterState.mapMode = 'aurn'
    initFilterPanel(onFilterChange)
  })

  test('clicking Forecast tab sets mapMode to forecast', () => {
    document.getElementById('map-type-forecast').click()
    expect(filterState.mapMode).toBe('forecast')
  })

  test('clicking Forecast tab sets aria-pressed correctly', () => {
    document.getElementById('map-type-forecast').click()
    expect(
      document.getElementById('map-type-forecast').getAttribute(ARIA_PRESSED)
    ).toBe('true')
    expect(
      document.getElementById('map-type-aurn').getAttribute(ARIA_PRESSED)
    ).toBe('false')
  })

  test('clicking Forecast tab hides pollutant controls and shows forecast day controls', () => {
    document.getElementById('map-type-forecast').click()
    expect(document.getElementById('pollutant-filter-controls').hidden).toBe(
      true
    )
    expect(document.getElementById('forecast-day-controls').hidden).toBe(false)
  })

  test('clicking Forecast tab updates active class', () => {
    document.getElementById('map-type-forecast').click()
    expect(
      document
        .getElementById('map-type-forecast')
        .classList.contains('aq-filter-panel__tab--active')
    ).toBe(true)
    expect(
      document
        .getElementById('map-type-aurn')
        .classList.contains('aq-filter-panel__tab--active')
    ).toBe(false)
  })

  test('clicking Forecast tab calls onFilterChange', () => {
    document.getElementById('map-type-forecast').click()
    expect(onFilterChange).toHaveBeenCalledTimes(1)
  })

  test('clicking Monitoring stations tab sets mapMode to aurn', () => {
    filterState.mapMode = 'forecast'
    document.getElementById('map-type-aurn').click()
    expect(filterState.mapMode).toBe('aurn')
  })

  test('clicking Monitoring stations tab sets aria-pressed correctly', () => {
    document.getElementById('map-type-forecast').click()
    document.getElementById('map-type-aurn').click()
    expect(
      document.getElementById('map-type-aurn').getAttribute(ARIA_PRESSED)
    ).toBe('true')
    expect(
      document.getElementById('map-type-forecast').getAttribute(ARIA_PRESSED)
    ).toBe('false')
  })

  test('clicking Monitoring stations tab shows pollutant controls and hides forecast day controls', () => {
    document.getElementById('map-type-forecast').click()
    document.getElementById('map-type-aurn').click()
    expect(document.getElementById('pollutant-filter-controls').hidden).toBe(
      false
    )
    expect(document.getElementById('forecast-day-controls').hidden).toBe(true)
  })

  test('clicking Monitoring stations tab calls onFilterChange', () => {
    document.getElementById('map-type-aurn').click()
    expect(onFilterChange).toHaveBeenCalled()
  })
})

describe('map-filter-panel — applyFilterState', () => {
  beforeEach(() => {
    buildDom()
    document.getElementById('filter-daqi-content').innerHTML = `
      <input type="checkbox" name="filter-pollutant" value="NO2" checked>
      <input type="checkbox" name="filter-pollutant" value="O3" checked>`
    filterState.mode = 'daqi'
    filterState.mapMode = 'aurn'
    filterState.selected = new Set(['NO2', 'O3'])
  })

  test('does nothing when there is no saved state', () => {
    applyFilterState(undefined)
    expect(filterState.mode).toBe('daqi')
    expect(filterState.mapMode).toBe('aurn')
  })

  test('restores the forecast map type and its controls', () => {
    applyFilterState({ mapMode: 'forecast' })
    expect(filterState.mapMode).toBe('forecast')
    expect(
      document.getElementById('map-type-forecast').getAttribute(ARIA_PRESSED)
    ).toBe('true')
    expect(document.getElementById('pollutant-filter-controls').hidden).toBe(
      true
    )
    expect(document.getElementById('forecast-day-controls').hidden).toBe(false)
  })

  test('restores the Other pollutants tab', () => {
    applyFilterState({ mode: 'other' })
    expect(filterState.mode).toBe('other')
    expect(document.getElementById('filter-other-content').hidden).toBe(false)
    expect(document.getElementById('filter-daqi-content').hidden).toBe(true)
  })

  test('restores the selected pollutants in state and checkboxes', () => {
    applyFilterState({ selected: ['O3'] })
    expect([...filterState.selected]).toEqual(['O3'])
    const [no2, o3] = document.querySelectorAll(
      'input[name="filter-pollutant"]'
    )
    expect(no2.checked).toBe(false)
    expect(o3.checked).toBe(true)
  })

  test('restores an empty pollutant selection', () => {
    applyFilterState({ selected: [] })
    expect(filterState.selected.size).toBe(0)
    expect(document.querySelector('input:checked')).toBeNull()
  })
})
