/**
 * Content and mock data for the "Last 7 days" tab (partials/last7daystable.njk).
 *
 * The average and daily-exceedance toggletips reuse pollutant-toggletips.js's
 * `annual`/`daily` entries directly (same copy as the year table, per
 * designer guidance). `last7DaysLimits` below only covers hourly exceedances,
 * which don't have confirmed copy yet - see LAST_7_DAYS_STATION_TAB_PLAN.md
 * section 9 (deferred designer content). `limit` is intentionally omitted
 * here, so exceedanceCell never renders an "Above limit" tag for this
 * placeholder copy.
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */

const UNITS = 'micrograms per cubic metre (µg/m³)'

const hourlyToggletip = (name, concentration) => ({
  label: `More information about hourly exceedances for ${name}`,
  text: `An hourly exceedance is an hour where the ${name} level went above ${concentration} ${UNITS}.`
})

/** Per-pollutant hourly-exceedance copy shown in the 7-day table's toggletips. */
const last7DaysLimits = {
  'Nitrogen dioxide': {
    hourly: hourlyToggletip('nitrogen dioxide', 200)
  },
  'Sulphur dioxide': {
    hourly: hourlyToggletip('sulphur dioxide', 350)
  }
}

const last7DaysContent = {
  pageTitle: 'Last 7 days',
  heading: 'Air pollution summary: last 7 days',
  notice: 'Data has not been checked and verified',
  noDataMessage: 'Could not load data for the last 7 days.'
}

export { last7DaysContent, last7DaysLimits }
