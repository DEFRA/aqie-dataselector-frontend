/**
 * @jest-environment jsdom
 */

const originalGlobals = new Map()
function stubGlobal(key, value) {
  if (!originalGlobals.has(key)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
  }
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  })
}
function unstubAllGlobals() {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  originalGlobals.clear()
}

function setUpDom() {
  document.body.innerHTML = `
    <div id="stations-details">
      <p id="stations-count"></p>
      <div id="stations-content">
        <p id="stations-loading">Loading&hellip;</p>
      </div>
    </div>
  `
}

function stubFetchStations(stations) {
  stubGlobal(
    'fetch',
    jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stations })
    })
  )
}

// jsdom has no AbortSignal.timeout; browsers do
Object.defineProperty(AbortSignal, 'timeout', {
  value: () => new AbortController().signal,
  configurable: true
})

beforeEach(() => {
  setUpDom()
  stubGlobal('window', { navigateToStation: jest.fn() })
  jest.resetModules()
})

afterEach(() => {
  jest.restoreAllMocks()
  unstubAllGlobals()
})

describe('#initialiseStationList', () => {
  test('Should update the station count when stations are loaded', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'Station A',
        area: 'London',
        location: { coordinates: [51.5, -0.1] }
      },
      {
        localSiteID: 'UKA002',
        name: 'Station B',
        area: 'London',
        location: { coordinates: [51.6, -0.2] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.getElementById('stations-count').textContent).toBe('(2)')
  })

  test('Should group stations by area', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'London Stn',
        area: 'London',
        location: { coordinates: [51.5, -0.1] }
      },
      {
        localSiteID: 'UKA002',
        name: 'Manc Stn',
        area: 'Greater Manchester',
        location: { coordinates: [53.5, -2.2] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    const content = document.getElementById('stations-content')
    expect(content.textContent).toContain('London')
    expect(content.textContent).toContain('Greater Manchester')
  })

  test('Should sort areas alphabetically', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'B Stn',
        area: 'Zeta Area',
        location: { coordinates: [51.5, -0.1] }
      },
      {
        localSiteID: 'UKA002',
        name: 'A Stn',
        area: 'Alpha Area',
        location: { coordinates: [53.5, -2.2] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    const content = document.getElementById('stations-content')
    const text = content.textContent
    expect(text.indexOf('Alpha')).toBeLessThan(text.indexOf('Zeta'))
  })

  test('Should render station name as a button when location is present', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'Clickable',
        area: 'London',
        location: { coordinates: [51.5, -0.1] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    const btn = document.querySelector('button.govuk-link')
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Clickable')
  })

  test('Should render station name as text when location is absent', async () => {
    const stations = [
      { localSiteID: 'UKA001', name: 'No Location', area: 'London' }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.querySelector('button.govuk-link')).toBeNull()
    expect(document.getElementById('stations-content').textContent).toContain(
      'No Location'
    )
  })

  test('Should call globalThis.navigateToStation when a station button is clicked', async () => {
    const navigateFn = jest.fn()
    globalThis.navigateToStation = navigateFn
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'Clickable',
        area: 'London',
        location: { coordinates: [51.5, -0.1] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    document.querySelector('button.govuk-link').click()
    expect(navigateFn).toHaveBeenCalledWith(stations[0])
  })

  test('Should show active tag for stations with stationStatus "current"', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'Active Stn',
        area: 'London',
        stationStatus: 'current',
        location: { coordinates: [51.5, -0.1] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    const tag = document.querySelector('.aq-station-tag--active')
    expect(tag).not.toBeNull()
    expect(tag.textContent).toBe('Active')
  })

  test('Should show closed tag for stations with stationStatus "closed"', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'Closed Stn',
        area: 'London',
        stationStatus: 'closed',
        location: { coordinates: [51.5, -0.1] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    const tag = document.querySelector('.aq-station-tag--closed')
    expect(tag).not.toBeNull()
  })

  test('Should fall back to "Other" area when area is missing', async () => {
    const stations = [
      {
        localSiteID: 'UKA001',
        name: 'No Area',
        location: { coordinates: [51.5, -0.1] }
      }
    ]
    stubFetchStations(stations)
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.getElementById('stations-content').textContent).toContain(
      'Other'
    )
  })

  test('Should show error message when fetch fails', async () => {
    stubGlobal('fetch', jest.fn().mockRejectedValue(new Error('network error')))
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.getElementById('stations-content').textContent).toContain(
      'Could not load monitoring stations'
    )
    expect(document.getElementById('stations-content').textContent).toContain(
      'network error'
    )
  })

  test('Should show timeout message when fetch times out', async () => {
    const err = new Error('Aborted')
    err.name = 'TimeoutError'
    stubGlobal('fetch', jest.fn().mockRejectedValue(err))
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.getElementById('stations-content').textContent).toContain(
      'Connection timeout'
    )
  })

  test('Should show error when response is not ok', async () => {
    stubGlobal('fetch', jest.fn().mockResolvedValue({ ok: false, status: 503 }))
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    await initialiseStationList()
    expect(document.getElementById('stations-content').textContent).toContain(
      'Status 503'
    )
  })

  test('Should do nothing when content element is absent', async () => {
    document.body.innerHTML = '<div id="stations-count"></div>'
    stubFetchStations([
      {
        localSiteID: 'UKA001',
        name: 'Stn',
        area: 'London',
        location: { coordinates: [51.5, -0.1] }
      }
    ])
    const { initialiseStationList, ready } = await import('./station-list.js')
    await ready
    // Should not throw
    await expect(initialiseStationList()).resolves.toBeUndefined()
  })
})

describe('#escapeHtml', () => {
  test('Should escape ampersand', async () => {
    const { escapeHtml } = await import('./station-list.js')
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  test('Should escape angle brackets', async () => {
    const { escapeHtml } = await import('./station-list.js')
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  test('Should escape double quotes', async () => {
    const { escapeHtml } = await import('./station-list.js')
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })
})
