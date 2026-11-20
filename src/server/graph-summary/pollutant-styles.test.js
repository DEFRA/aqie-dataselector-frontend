import { POLLUTANT_STYLES } from './pollutant-styles.js'

const channel = (hex, start) => {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const luminance = (hex) =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)

describe('POLLUTANT_STYLES', () => {
  it.each(Object.entries(POLLUTANT_STYLES))(
    'draws %s with at least 3:1 contrast against white (WCAG 1.4.11)',
    (_code, { colour }) => {
      expect(1.05 / (luminance(colour) + 0.05)).toBeGreaterThanOrEqual(3)
    }
  )
})
