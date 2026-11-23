// Official Defra DAQI colours indexed by value (1–10); index 0 is unused.
// Source: https://uk-air.defra.gov.uk/air-pollution/daqi?view=more-info
const daqiBg = [
  null,
  '#9cff9c',
  '#31ff00',
  '#31cf00',
  '#ffff00',
  '#ffcf00',
  '#ff9a00',
  '#ff9292',
  '#ff0000',
  '#990000',
  '#ce30ff'
]

// Colours light enough to require dark text on the marker label.
const DAQI_LIGHT_BG = new Set([
  '#9cff9c',
  '#31ff00',
  '#31cf00',
  '#ffff00',
  '#ffcf00',
  '#ff9a00',
  '#ff9292'
])

const daqiBand = [
  null,
  'Low',
  'Low',
  'Low',
  'Moderate',
  'Moderate',
  'Moderate',
  'High',
  'High',
  'High',
  'Very High'
]

/**
 * Confines an untrusted DAQI value to a genuine finite number, or null.
 * Values outside the 1–10 band (e.g. 11) are still passed through so callers
 * can render a plain/unstyled tag rather than treating them as unavailable.
 * @param {unknown} value
 * @returns {number|null}
 */
function toSafeDaqiIndex(value) {
  return Number.isFinite(value) ? value : null
}

/**
 * Builds SVG marker options coloured by DAQI value.
 * Falls back to grey when no DAQI value is available.
 * @param {number|null} daqiValue - DAQI index 1–10, or null
 * @param {boolean} selected
 * @returns {{ svgContent: string, viewBox: string, anchor: [number, number] }}
 */
function daqiMarkerOptions(daqiValue, selected) {
  const daqiIndex = toSafeDaqiIndex(daqiValue)

  let bg
  if (daqiIndex && daqiBg[daqiIndex]) {
    bg = daqiBg[daqiIndex]
  } else if (selected) {
    bg = '#555555'
  } else {
    bg = '#777777'
  }
  const strokeAttr = selected
    ? 'stroke="#0b0c0c" stroke-width="2"'
    : 'stroke="white" stroke-width="2"'
  const textFill = DAQI_LIGHT_BG.has(bg) ? '#0b0c0c' : '#ffffff'
  const label = daqiIndex
    ? `<text x="19" y="24" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="${textFill}">${daqiIndex}</text>`
    : ''
  const shadow =
    '<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>' +
    '</filter></defs>'
  return {
    svgContent: `${shadow}<circle cx="19" cy="19" r="14" fill="${bg}" ${strokeAttr} filter="url(#ds)"/>${label}`,
    viewBox: '0 0 38 38',
    anchor: [0.5, 0.5]
  }
}

export { daqiBand, daqiMarkerOptions, toSafeDaqiIndex }
