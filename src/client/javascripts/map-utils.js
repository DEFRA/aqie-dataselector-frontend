const NOT_AVAILABLE = 'Not available'

const pollutantLabels = {
  NO2: 'NO₂',
  O3: 'O₃',
  SO2: 'SO₂',
  PM25: 'PM2.5',
  PM10: 'PM10'
}

/**
 * Prevents XSS when setting innerHTML with user-sourced station data.
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
 * Returns an HTML status tag string for the station name heading, or '' if no tag is needed.
 * @param {string} status - lowercased station status
 * @param {boolean} isClosed
 * @returns {string}
 */
function stationStatusTag(status, isClosed) {
  const tagLabel =
    status === 'current'
      ? 'Active'
      : status.charAt(0).toUpperCase() + status.slice(1)

  if (status === 'current') {
    return ` <strong class="aq-station-tag aq-station-tag--active">${escapeHtml(tagLabel)}</strong>`
  }
  if (isClosed) {
    return ` <strong class="aq-station-tag aq-station-tag--closed">${escapeHtml(tagLabel)}</strong>`
  }
  return ''
}

export {
  NOT_AVAILABLE,
  pollutantLabels,
  escapeHtml,
  formatDate,
  stationStatusTag
}
