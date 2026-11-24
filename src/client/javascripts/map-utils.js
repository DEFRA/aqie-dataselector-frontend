const NOT_AVAILABLE = 'Not available'

const pollutantLabels = {
  NO2: 'NO₂',
  O3: 'O₃',
  SO2: 'SO₂',
  PM25: 'PM2.5',
  PM10: 'PM10'
}

/**
 * Formats an ISO date string to a human-readable en-GB date.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) {
    return ''
  }
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return dateStr
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Returns the status tag element for the station name heading, or null if no tag is needed.
 * @param {string} status - lowercased station status
 * @param {boolean} isClosed
 * @param {boolean} [isInactive] - an open station that is not currently providing data
 * @returns {HTMLElement|null}
 */
function stationStatusTag(status, isClosed, isInactive = false) {
  let modifier
  let label
  if (isClosed) {
    modifier = 'closed'
    label = 'Closed'
  } else if (status === 'current') {
    modifier = isInactive ? 'inactive' : 'active'
    label = isInactive ? 'Inactive' : 'Active'
  } else {
    return null
  }
  const tag = document.createElement('strong')
  tag.className = `aq-station-tag aq-station-tag--${modifier}`
  tag.textContent = label
  return tag
}

export { NOT_AVAILABLE, pollutantLabels, formatDate, stationStatusTag }
