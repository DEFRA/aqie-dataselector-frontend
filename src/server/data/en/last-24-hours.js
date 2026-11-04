/**
 * Content for the "Last 24 hours" tab (partials/last24hourstable.njk).
 *
 * The 24 hour average column reuses pollutant-toggletips.js's `annual` entries
 * directly, and the hourly exceedances column reuses its `hourly` entries for
 * the two pollutants that have one (nitrogen dioxide and sulphur dioxide), so
 * the copy is identical to the year table's, as the acceptance criteria
 * require. `last24HoursLimits` below only exists to drop each entry's `limit`:
 * the legal allowance is per calendar year, so comparing a single day's count
 * against it would be misleading and exceedanceCell must never render an
 * "Above limit" tag here - the same reasoning as last-7-days.js.
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */

import { pollutantToggletips } from '~/src/server/data/en/pollutant-toggletips.js'

const HOURLY_EXCEEDANCE_POLLUTANTS = ['Nitrogen dioxide', 'Sulphur dioxide']

/** The toggletip's label and text, without the annual allowance `limit`. */
const withoutLimit = ({ label, text }) => ({ label, text })

/** Per-pollutant hourly-exceedance toggletips shown in the 24-hour table. */
const last24HoursLimits = Object.fromEntries(
  HOURLY_EXCEEDANCE_POLLUTANTS.map((name) => [
    name,
    { hourly: withoutLimit(pollutantToggletips[name].hourly) }
  ])
)

const last24HoursContent = {
  pageTitle: 'Last 24 hours',
  tabLabel: 'Last 24 hours',
  heading: 'Air pollution summary: last 24 hours',
  notice: 'Data has not been checked and verified',
  noDataMessage: 'Could not load data for the last 24 hours.',
  noMappingMessage: 'The last 24 hours view is not available for this station.',
  legalLimitsUrl: 'https://www.gov.uk/guidance/air-pollution-uk-legal-limits'
}

export { last24HoursContent, last24HoursLimits }
