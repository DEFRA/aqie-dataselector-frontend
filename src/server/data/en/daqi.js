/**
 * Content and toggletip copy for the "Daily Air Quality Index" (DAQI) tab
 * (partials/daqitable.njk).
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */

const daqiColumnToggletip = {
  label: 'More information about the Daily Air Quality Index (DAQI)',
  text: 'The Daily Air Quality Index (DAQI) is a simple 10-point scale designed to help people understand the short term risk of air pollution.'
}

const daqiContent = {
  pageTitle: 'Daily Air Quality Index',
  tabLabel: 'Daily Air Quality Index',
  heading: 'Air pollution summary: Daily Air Quality Index (DAQI)',
  noScriptMessage:
    'JavaScript is disabled. You are viewing the latest Daily Air Quality Index (DAQI) data.',
  notice: 'Data has not been checked and verified',
  noDataMessage:
    'Could not load Daily Air Quality Index data for this station.',
  noMappingMessage:
    'The Daily Air Quality Index view is not available for this station.',
  learnMoreUrl:
    'https://www.gov.uk/government/publications/health-effects-of-air-pollution/using-the-daily-air-quality-index-daqi'
}

export { daqiContent, daqiColumnToggletip }
