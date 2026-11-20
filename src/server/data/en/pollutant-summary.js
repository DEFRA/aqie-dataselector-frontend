/**
 * Columns of the pollutant summary table (partials/pollutant-summary-table.njk)
 * for each aqie-back-end history period. `key` says which figure of a row the
 * column shows (average, daily or hourly) and names its cell's CSS modifier.
 *
 * Exposed to templates as nunjucks globals - see src/config/nunjucks/globals.
 */
import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'

const summaryTableColumns = {
  [HISTORY_PERIOD.LAST_24_HOURS]: [
    { key: 'average', title: '24 hour average' },
    { key: 'hourly', title: 'Hourly exceedances' }
  ],
  [HISTORY_PERIOD.LAST_7_DAYS]: [
    { key: 'average', title: 'Average' },
    { key: 'daily', title: 'Daily exceedances' },
    { key: 'hourly', title: 'Hourly exceedances' }
  ]
}

export { summaryTableColumns }
