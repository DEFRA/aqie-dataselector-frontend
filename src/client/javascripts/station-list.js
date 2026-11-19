/**
 * Loads monitoring stations and renders a collapsible list grouped by area.
 * Each station name is a button that calls globalThis.navigateToStation() to pan
 * the map to that station and open the station panel.
 */
async function initialiseStationList() {
  const countEl = document.getElementById('stations-count')
  const contentEl = document.getElementById('stations-content')

  let stations
  try {
    stations = await fetchStations()
  } catch (err) {
    const message =
      err.name === 'TimeoutError' || err.name === 'AbortError'
        ? 'Connection timeout'
        : err.message
    if (contentEl) {
      contentEl.innerHTML = `<p class="govuk-body-s">Could not load monitoring stations: <code>${escapeHtml(message)}</code></p>`
    }
    return
  }

  if (countEl) {
    countEl.textContent = `(${stations.length})`
  }
  if (!contentEl) {
    return
  }

  const areas = groupByArea(stations)
  const fragment = buildFragment(areas)
  contentEl.innerHTML = ''
  contentEl.appendChild(fragment)
}

/**
 * Fetches the monitoring stations array from the API.
 * @returns {Promise<Array>}
 */
async function fetchStations() {
  const response = await fetch('/api/monitoring-stations', {
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) {
    throw new Error(`Status ${response.status}`)
  }
  const data = await response.json()
  return data.stations ?? []
}

/**
 * Groups a flat station array into an object keyed by area name.
 * @param {Array} stations
 * @returns {Record<string, Array>}
 */
function groupByArea(stations) {
  const areas = {}
  stations.forEach((s) => {
    const area = s.area || 'Other'
    if (!areas[area]) {
      areas[area] = []
    }
    areas[area].push(s)
  })
  return areas
}

/**
 * Builds a DocumentFragment containing one <details> per area.
 * @param {Record<string, Array>} areas
 * @returns {DocumentFragment}
 */
function buildFragment(areas) {
  const fragment = document.createDocumentFragment()
  Object.keys(areas)
    .sort((a, b) => a.localeCompare(b))
    .forEach((areaName) => {
      fragment.appendChild(buildAreaDetails(areaName, areas[areaName]))
    })
  return fragment
}

/**
 * Builds a <details> element for a single area with a station list inside.
 * @param {string} areaName
 * @param {Array} stations
 * @returns {HTMLDetailsElement}
 */
function buildAreaDetails(areaName, stations) {
  const details = document.createElement('details')
  details.className = 'govuk-details govuk-!-margin-bottom-2'

  const summary = document.createElement('summary')
  summary.className = 'govuk-details__summary'
  const summaryText = document.createElement('span')
  summaryText.className = 'govuk-details__summary-text'
  summaryText.textContent = `${areaName} (${stations.length})`
  summary.appendChild(summaryText)
  details.appendChild(summary)

  const div = document.createElement('div')
  div.className = 'govuk-details__text'
  const ul = document.createElement('ul')
  ul.className = 'govuk-list govuk-list--bullet'
  stations.forEach((s) => {
    ul.appendChild(buildStationItem(s))
  })
  div.appendChild(ul)
  details.appendChild(div)

  return details
}

/**
 * Returns the tag label and CSS class for a station's status.
 * @param {string} statusRaw - lowercased station status
 * @returns {{ tagLabel: string, tagClass: string }}
 */
function stationTagInfo(statusRaw) {
  let tagLabel
  if (statusRaw === 'current') {
    tagLabel = 'Active'
  } else if (statusRaw) {
    tagLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
  } else {
    tagLabel = ''
  }

  let tagClass
  if (statusRaw === 'current') {
    tagClass = 'aq-station-tag--active'
  } else if (statusRaw === 'closed') {
    tagClass = 'aq-station-tag--closed'
  } else {
    tagClass = ''
  }

  return { tagLabel, tagClass }
}

/**
 * Returns a navigate button for stations with a valid location, or a plain text node.
 * @param {object} s
 * @returns {HTMLButtonElement|Text}
 */
function buildStationContent(s) {
  if (s.location && Array.isArray(s.location.coordinates)) {
    const btn = document.createElement('button')
    btn.className = 'govuk-link'
    btn.style.cssText =
      'background:none;border:none;padding:0;cursor:pointer;font:inherit'
    btn.textContent = s.name
    btn.addEventListener('click', function () {
      globalThis.navigateToStation(s)
    })
    return btn
  }
  return document.createTextNode(s.name || '')
}

/**
 * Builds an <li> element for a single station with a nav button and status tag.
 * @param {object} s
 * @returns {HTMLLIElement}
 */
function buildStationItem(s) {
  const li = document.createElement('li')

  const statusRaw = (
    s.stationStatus ||
    s.status ||
    s.siteStatus ||
    ''
  ).toLowerCase()
  const { tagLabel, tagClass } = stationTagInfo(statusRaw)

  li.appendChild(buildStationContent(s))

  if (tagLabel && tagClass) {
    const tag = document.createElement('strong')
    tag.className = `aq-station-tag ${tagClass}`
    tag.textContent = tagLabel
    li.appendChild(document.createTextNode(' '))
    li.appendChild(tag)
  }

  return li
}

/**
 * Prevents XSS in error messages inserted into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const ready = initialiseStationList()

export {
  ready,
  initialiseStationList,
  fetchStations,
  groupByArea,
  buildFragment,
  buildAreaDetails,
  buildStationItem,
  escapeHtml
}
