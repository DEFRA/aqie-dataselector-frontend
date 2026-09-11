/**
 * UK limit values and the toggletip copy that explains them, for the yearly
 * air pollution levels table (partials/yearlytable.njk).
 *
 * `limit` is the number the table compares a measurement against, and it is
 * interpolated into the sentence the toggletip shows, so the copy and the
 * "Above limit" tag can never disagree.
 *
 * Keys must match the `pollutantName` returned by the table API. A pollutant
 * with no entry renders a plain count with no toggletip.
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */

const UNITS = 'micrograms per cubic metre (µg/m³)'
const ROUNDING = 'in a calendar year (when rounded to a whole number).'

const DAILY = 'daily'
const HOURLY = 'hourly'

// How each pollutant reads inside the toggletip sentences: particulates keep
// their uppercase form, gases read as prose.
const PM25 = 'PM2.5'
const PM10 = 'PM10'
const NITROGEN_DIOXIDE = 'nitrogen dioxide'
const SULPHUR_DIOXIDE = 'sulphur dioxide'
const OZONE = 'ozone'

/** Data capture below this percentage is treated as too low to average. */
const lowDataCaptureThreshold = 75

const annualLabel = (name) =>
  `More information about the UK annual average limit value for ${name}`

/** An annual average that has a UK limit value. */
const annualLimit = ({ name, limit }) => ({
  limit,
  label: annualLabel(name),
  text: `Annual average ${name} levels at any site must not go above ${limit} ${UNITS} ${ROUNDING}`
})

/** An annual average with no UK limit value: no limit, so no "Above limit" tag. */
const noAnnualLimit = (name) => ({
  limit: null,
  label: annualLabel(name),
  text: `There is no annual average limit value for ${name}.`
})

/**
 * A daily or hourly exceedance allowance: how many times the concentration
 * may be exceeded before the site is over its allowance for the year.
 */
const exceedanceLimit = ({ period, name, concentration, allowance }) => ({
  limit: allowance,
  label: `More information about ${period} exceedances for ${name}`,
  text: `${period === DAILY ? 'Daily average' : 'Hourly'} ${name} levels must not go above ${concentration} ${UNITS} more than ${allowance} times ${ROUNDING}`
})

const pollutantToggletips = {
  [PM25]: {
    annual: annualLimit({ name: PM25, limit: 20 })
  },
  [PM10]: {
    annual: annualLimit({ name: PM10, limit: 40 }),
    daily: exceedanceLimit({
      period: DAILY,
      name: PM10,
      concentration: 50,
      allowance: 35
    })
  },
  'Nitrogen dioxide': {
    annual: annualLimit({ name: NITROGEN_DIOXIDE, limit: 40 }),
    hourly: exceedanceLimit({
      period: HOURLY,
      name: NITROGEN_DIOXIDE,
      concentration: 200,
      allowance: 18
    })
  },
  'Sulphur dioxide': {
    annual: noAnnualLimit(SULPHUR_DIOXIDE),
    daily: exceedanceLimit({
      period: DAILY,
      name: SULPHUR_DIOXIDE,
      concentration: 125,
      allowance: 3
    }),
    hourly: exceedanceLimit({
      period: HOURLY,
      name: SULPHUR_DIOXIDE,
      concentration: 350,
      allowance: 24
    })
  },
  Ozone: {
    annual: noAnnualLimit(OZONE)
  }
}

const dataCaptureToggletip = {
  label: 'More information about the Data capture percentage',
  text: `Data capture under ${lowDataCaptureThreshold}% is low. We do not calculate the average when data capture is low.`
}

export { pollutantToggletips, dataCaptureToggletip, lowDataCaptureThreshold }
