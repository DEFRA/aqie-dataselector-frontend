import {
  last24HoursContent,
  last24HoursLimits
} from '~/src/server/data/en/last-24-hours.js'

describe('last24HoursContent', () => {
  it('uses the heading from the acceptance criteria', () => {
    expect(last24HoursContent.heading).toBe(
      'Air pollution summary: last 24 hours'
    )
  })
})

describe('last24HoursLimits', () => {
  it('has the hourly exceedance toggletip copy for nitrogen dioxide', () => {
    expect(last24HoursLimits['Nitrogen dioxide'].hourly.text).toBe(
      'Hourly nitrogen dioxide levels must not go above 200 micrograms per cubic metre (µg/m³) more than 18 times in a calendar year (when rounded to a whole number).'
    )
  })

  it('has the hourly exceedance toggletip copy for sulphur dioxide', () => {
    expect(last24HoursLimits['Sulphur dioxide'].hourly.text).toBe(
      'Hourly sulphur dioxide levels must not go above 350 micrograms per cubic metre (µg/m³) more than 24 times in a calendar year (when rounded to a whole number).'
    )
  })

  it('has no hourly exceedance toggletip for pollutants without a legal limit', () => {
    expect(Object.keys(last24HoursLimits)).toEqual([
      'Nitrogen dioxide',
      'Sulphur dioxide'
    ])
  })

  it('omits the annual allowance so no "Above limit" tag can be drawn', () => {
    Object.values(last24HoursLimits).forEach(({ hourly }) => {
      expect(hourly).not.toHaveProperty('limit')
      expect(hourly.label).toEqual(expect.any(String))
    })
  })
})
