/**
 * @jest-environment jsdom
 */

import { initMapPanels, setStationPanelOpen } from './map-panels.js'

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

afterEach(unstubAllGlobals)

const MOBILE_MEDIA_QUERY = 'not all and (min-width: 32.5em)'

let view

// Matches the server-rendered state: map key and Menu button hidden
function buildDom() {
  document.body.innerHTML = `
    <div id="filter-panel" tabindex="-1">
      <button id="filter-panel-close"></button>
    </div>
    <div id="map-key-overlay" tabindex="-1" hidden>
      <button id="map-key-close"></button>
    </div>
    <button id="filter-button" hidden></button>
    <button id="key-button"></button>
  `
}

function byId(id) {
  return document.getElementById(id)
}

function stubView(isMobile) {
  const listeners = []
  view = {
    mediaQueryList: {
      matches: isMobile,
      addEventListener: jest.fn((_type, listener) => listeners.push(listener))
    },
    changeTo(isMobileNow) {
      view.mediaQueryList.matches = isMobileNow
      listeners.forEach((listener) => listener())
    }
  }
  stubGlobal(
    'matchMedia',
    jest.fn(() => view.mediaQueryList)
  )
}

// closeStationPanel reports the station panel closed, as the real one does
function startMapPanels() {
  const closeStationPanel = jest.fn(() => setStationPanelOpen(false))
  initMapPanels({ closeStationPanel })
  return closeStationPanel
}

beforeEach(() => {
  buildDom()
})

afterEach(() => {
  delete globalThis.matchMedia
})

describe('#initMapPanels', () => {
  test('Should open the filter panel and map key and hide both buttons on larger screens', () => {
    stubView(false)
    startMapPanels()
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('filter-button').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(true)
  })

  test('Should treat a missing matchMedia as a larger screen', () => {
    startMapPanels()
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(false)
  })

  test('Should open the filter panel, close the map key and show the Key button on mobile', () => {
    stubView(true)
    startMapPanels()
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(true)
    expect(byId('filter-button').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should use the mobile media query that complements the stylesheet breakpoint', () => {
    stubView(false)
    startMapPanels()
    expect(globalThis.matchMedia).toHaveBeenCalledWith(MOBILE_MEDIA_QUERY)
  })

  test('Should listen for the viewport crossing the mobile breakpoint', () => {
    stubView(false)
    startMapPanels()
    expect(view.mediaQueryList.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
  })

  test('Should reset the panels to their initial state when called again', () => {
    stubView(false)
    startMapPanels()
    byId('map-key-close').click()
    setStationPanelOpen(true)
    buildDom()
    startMapPanels()
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('filter-panel').hidden).toBe(false)
  })

  test('Should not throw when the panel elements are not in the DOM', () => {
    document.body.innerHTML = ''
    expect(() => startMapPanels()).not.toThrow()
  })

  test('Should not throw when the media query list cannot report changes', () => {
    stubView(false)
    delete view.mediaQueryList.addEventListener
    expect(() => startMapPanels()).not.toThrow()
  })
})

describe('#initMapPanels — buttons on larger screens', () => {
  beforeEach(() => {
    stubView(false)
    startMapPanels()
  })

  test('Should close the map key and show the Key button when the map key close button is clicked', () => {
    byId('map-key-close').click()
    expect(byId('map-key-overlay').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should move focus to the Key button when the map key is closed', () => {
    byId('map-key-close').click()
    expect(document.activeElement).toBe(byId('key-button'))
  })

  test('Should reopen the map key and hide the Key button when the Key button is clicked', () => {
    byId('map-key-close').click()
    byId('key-button').click()
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('key-button').hidden).toBe(true)
  })

  test('Should move focus to the map key when it is reopened', () => {
    byId('map-key-close').click()
    byId('key-button').click()
    expect(document.activeElement).toBe(byId('map-key-overlay'))
  })

  test('Should close the filter panel and show the Menu button when the filter panel close button is clicked', () => {
    byId('filter-panel-close').click()
    expect(byId('filter-panel').hidden).toBe(true)
    expect(byId('filter-button').hidden).toBe(false)
  })

  test('Should move focus to the Menu button when the filter panel is closed', () => {
    byId('filter-panel-close').click()
    expect(document.activeElement).toBe(byId('filter-button'))
  })

  test('Should reopen the filter panel and hide the Menu button when the Menu button is clicked', () => {
    byId('filter-panel-close').click()
    byId('filter-button').click()
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('filter-button').hidden).toBe(true)
  })

  test('Should move focus to the filter panel when it is reopened', () => {
    byId('filter-panel-close').click()
    byId('filter-button').click()
    expect(document.activeElement).toBe(byId('filter-panel'))
  })

  test('Should keep the filter panel open when the map key is closed and reopened', () => {
    byId('map-key-close').click()
    byId('key-button').click()
    expect(byId('filter-panel').hidden).toBe(false)
  })

  test('Should keep the map key open when the filter panel is closed and reopened', () => {
    byId('filter-panel-close').click()
    byId('filter-button').click()
    expect(byId('map-key-overlay').hidden).toBe(false)
  })
})

describe('#initMapPanels — buttons on mobile', () => {
  beforeEach(() => {
    stubView(true)
    startMapPanels()
  })

  test('Should swap the filter panel for the map key when the Key button is clicked', () => {
    byId('key-button').click()
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('filter-panel').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(true)
    expect(byId('filter-button').hidden).toBe(false)
  })

  test('Should swap the map key for the filter panel when the Menu button is clicked', () => {
    byId('key-button').click()
    byId('filter-button').click()
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(true)
    expect(byId('filter-button').hidden).toBe(true)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should show both buttons when the filter panel is closed and the map key is closed', () => {
    byId('filter-panel-close').click()
    expect(byId('filter-button').hidden).toBe(false)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should show both buttons when the map key is closed after it replaced the filter panel', () => {
    byId('key-button').click()
    byId('map-key-close').click()
    expect(byId('filter-panel').hidden).toBe(true)
    expect(byId('filter-button').hidden).toBe(false)
    expect(byId('key-button').hidden).toBe(false)
  })
})

describe('#setStationPanelOpen', () => {
  describe('on larger screens', () => {
    beforeEach(() => {
      stubView(false)
      startMapPanels()
    })

    test('Should cover the map key while the station panel is open', () => {
      setStationPanelOpen(true)
      expect(byId('map-key-overlay').hidden).toBe(true)
    })

    test('Should not offer the Key button while the station panel covers an open map key', () => {
      setStationPanelOpen(true)
      expect(byId('key-button').hidden).toBe(true)
    })

    test('Should leave the filter panel and the Menu button alone', () => {
      setStationPanelOpen(true)
      expect(byId('filter-panel').hidden).toBe(false)
      expect(byId('filter-button').hidden).toBe(true)
    })

    test('Should bring the map key back when the station panel closes', () => {
      setStationPanelOpen(true)
      setStationPanelOpen(false)
      expect(byId('map-key-overlay').hidden).toBe(false)
    })

    test('Should not reopen a map key the user closed when the station panel closes', () => {
      byId('map-key-close').click()
      setStationPanelOpen(true)
      setStationPanelOpen(false)
      expect(byId('map-key-overlay').hidden).toBe(true)
      expect(byId('key-button').hidden).toBe(false)
    })
  })

  describe('on mobile', () => {
    beforeEach(() => {
      stubView(true)
      startMapPanels()
    })

    test('Should cover the filter panel and show the Menu button while the station panel is open', () => {
      setStationPanelOpen(true)
      expect(byId('filter-panel').hidden).toBe(true)
      expect(byId('filter-button').hidden).toBe(false)
    })

    test('Should bring the filter panel back when the station panel closes', () => {
      setStationPanelOpen(true)
      setStationPanelOpen(false)
      expect(byId('filter-panel').hidden).toBe(false)
      expect(byId('filter-button').hidden).toBe(true)
    })

    test('Should not open the map key when the station panel closes and the map key was closed', () => {
      setStationPanelOpen(true)
      setStationPanelOpen(false)
      expect(byId('map-key-overlay').hidden).toBe(true)
    })
  })
})

describe('#initMapPanels — buttons needing the space the station panel uses', () => {
  test('Should close the station panel when the Key button is clicked on a larger screen', () => {
    stubView(false)
    const closeStationPanel = startMapPanels()
    byId('map-key-close').click()
    setStationPanelOpen(true)
    byId('key-button').click()
    expect(closeStationPanel).toHaveBeenCalledTimes(1)
    expect(byId('map-key-overlay').hidden).toBe(false)
  })

  test('Should leave the station panel open when the Menu button is clicked on a larger screen', () => {
    stubView(false)
    const closeStationPanel = startMapPanels()
    byId('filter-panel-close').click()
    setStationPanelOpen(true)
    byId('filter-button').click()
    expect(closeStationPanel).not.toHaveBeenCalled()
    expect(byId('filter-panel').hidden).toBe(false)
  })

  test('Should close the station panel when the Key button is clicked on mobile', () => {
    stubView(true)
    const closeStationPanel = startMapPanels()
    setStationPanelOpen(true)
    byId('key-button').click()
    expect(closeStationPanel).toHaveBeenCalledTimes(1)
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('filter-panel').hidden).toBe(true)
  })

  test('Should close the station panel when the Menu button is clicked on mobile', () => {
    stubView(true)
    const closeStationPanel = startMapPanels()
    setStationPanelOpen(true)
    byId('filter-button').click()
    expect(closeStationPanel).toHaveBeenCalledTimes(1)
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(true)
  })

  test('Should not close the station panel when it is not open', () => {
    stubView(true)
    const closeStationPanel = startMapPanels()
    byId('key-button').click()
    byId('filter-button').click()
    expect(closeStationPanel).not.toHaveBeenCalled()
  })

  test('Should not throw when no closeStationPanel callback was supplied', () => {
    stubView(true)
    initMapPanels({})
    setStationPanelOpen(true)
    expect(() => byId('key-button').click()).not.toThrow()
    expect(byId('map-key-overlay').hidden).toBe(true)
  })
})

describe('#initMapPanels — viewport changes', () => {
  test('Should close the map key when the viewport becomes mobile with both panels open', () => {
    stubView(false)
    startMapPanels()
    view.changeTo(true)
    expect(byId('map-key-overlay').hidden).toBe(true)
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('key-button').hidden).toBe(false)
  })

  test('Should keep an open map key when the viewport becomes mobile with the filter panel closed', () => {
    stubView(false)
    startMapPanels()
    byId('filter-panel-close').click()
    view.changeTo(true)
    expect(byId('map-key-overlay').hidden).toBe(false)
    expect(byId('filter-panel').hidden).toBe(true)
  })

  test('Should keep the panels as they are when the viewport becomes larger', () => {
    stubView(true)
    startMapPanels()
    view.changeTo(false)
    expect(byId('filter-panel').hidden).toBe(false)
    expect(byId('map-key-overlay').hidden).toBe(true)
  })

  test('Should uncover the filter panel when the viewport becomes larger with the station panel open', () => {
    stubView(true)
    startMapPanels()
    setStationPanelOpen(true)
    view.changeTo(false)
    expect(byId('filter-panel').hidden).toBe(false)
  })
})

describe('#initMapPanels — focus when the viewport changes', () => {
  test('Should move focus to the Key button when the map key had focus and is closed', () => {
    stubView(false)
    startMapPanels()
    byId('map-key-close').focus()
    view.changeTo(true)
    expect(document.activeElement).toBe(byId('key-button'))
  })

  test('Should move focus to the Key button when the map key itself had focus', () => {
    stubView(false)
    startMapPanels()
    byId('map-key-overlay').focus()
    view.changeTo(true)
    expect(document.activeElement).toBe(byId('key-button'))
  })

  test('Should move focus to the Menu button when the filter panel had focus and is covered by the station panel', () => {
    stubView(false)
    startMapPanels()
    setStationPanelOpen(true)
    byId('filter-panel-close').focus()
    view.changeTo(true)
    expect(document.activeElement).toBe(byId('filter-button'))
  })

  test('Should keep focus in the filter panel when only the map key is closed', () => {
    stubView(false)
    startMapPanels()
    byId('filter-panel-close').focus()
    view.changeTo(true)
    expect(document.activeElement).toBe(byId('filter-panel-close'))
  })

  test('Should keep focus in the map key when it stays open', () => {
    stubView(false)
    startMapPanels()
    byId('filter-panel-close').click()
    byId('map-key-close').focus()
    view.changeTo(true)
    expect(document.activeElement).toBe(byId('map-key-close'))
  })

  test('Should not take focus when nothing had focus', () => {
    stubView(false)
    startMapPanels()
    view.changeTo(true)
    expect(document.activeElement).toBe(document.body)
  })

  test('Should not move focus when the viewport becomes larger', () => {
    stubView(true)
    startMapPanels()
    byId('filter-panel-close').focus()
    view.changeTo(false)
    expect(document.activeElement).toBe(byId('filter-panel-close'))
  })
})
