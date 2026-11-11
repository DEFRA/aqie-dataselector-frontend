/**
 * Content for the "Last 7 days" tab (partials/last7daystable.njk).
 *
 * The average, daily-exceedance and hourly-exceedance toggletips reuse
 * pollutant-toggletips.js's `annual`/`daily`/`hourly` entries directly (same
 * copy as the year table, per designer guidance).
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */

const last7DaysContent = {
  pageTitle: 'Last 7 days',
  heading: 'Air pollution summary: last 7 days',
  notice: 'Data has not been checked and verified',
  legalLimitsHint:
    'The pollution levels shown are measured against UK legal limits.',
  noDataMessage: 'Could not load data for the last 7 days.',
  noMappingMessage: 'The last 7 days view is not available for this station.'
}

export { last7DaysContent }
