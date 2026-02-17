/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

const VIEW_PATH = 'year_aurn/index'
const HREF_RANGE_START_YEAR = '#range-start-year'
const HREF_RANGE_END_YEAR = '#range-end-year'
const JANUARY_FIRST = '1 January'
const DECEMBER_THIRTY_FIRST = '31 December'

// Form field keys
const FIELD_ANY_YEAR_INPUT = 'any-year-input'
const FIELD_RANGE_START_YEAR = 'range-start-year'
const FIELD_RANGE_END_YEAR = 'range-end-year'

// Error field names
const ERROR_FIELD_ANY_YEAR = 'any-year'
const ERROR_FIELD_RANGE_START = 'range-start'
const ERROR_FIELD_RANGE_END = 'range-end'

// Error anchor hrefs
const HREF_ANY_YEAR_INPUT = '#any-year-input'

// Error messages
const MSG_ENTER_YEAR = 'Enter a year.'
const MSG_ENTER_START_YEAR = 'Enter a start year.'
const MSG_ENTER_END_YEAR = 'Enter an end year.'
const MSG_FOUR_DIGIT_YEAR_EXAMPLE = 'Enter a 4-digit year, for example 2009.'
const MSG_START_YEAR_FOUR_DIGITS =
  'Start year must be 4 digits, for example 2009.'
const MSG_END_YEAR_FOUR_DIGITS = 'End year must be 4 digits, for example 2010.'
const MSG_START_BEFORE_END =
  'Start year must be the same as or before the end year.'
const MSG_END_AFTER_START =
  'End year must be the same as or after the start year.'
const MSG_MAX_FIVE_YEARS = 'Choose up to 5 whole years at a time'

export const yearController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    // GET: render form, read and clear transient errors/data, and prefill from persistent session
    if (request.method === 'get') {
      const errors = request.yar.get('yearFormErrors') || {
        list: [],
        details: {}
      }
      const transientFormData = request.yar.get('yearFormData') || {}

      // Persistent, used when coming from /customdataset "Change" link
      const savedTime = request.yar.get('TimeSelectionMode') || ''
      const savedAny = request.yar.get('yearany') || ''
      const savedStart = request.yar.get('startYear') || ''
      const savedEnd = request.yar.get('endYear') || ''
      const savedYtdStart = request.yar.get('startyear_ytd') || ''

      // Prefer transient (last POST) over saved, then build formData for template
      const formData = {
        time: transientFormData.time || savedTime || '',
        [FIELD_ANY_YEAR_INPUT]:
          transientFormData[FIELD_ANY_YEAR_INPUT] || savedAny || '',
        [FIELD_RANGE_START_YEAR]:
          transientFormData[FIELD_RANGE_START_YEAR] ||
          savedStart ||
          savedYtdStart ||
          '',
        [FIELD_RANGE_END_YEAR]:
          transientFormData[FIELD_RANGE_END_YEAR] || savedEnd || ''
      }

      // Clear transient after reading (do not clear persistent)
      request.yar.clear('yearFormErrors')
      request.yar.clear('yearFormData')

      return h.view(VIEW_PATH, {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl,
        errors,
        formData
      })
    } else if (request.method === 'post') {
      const payload = request.payload || {}
      const errors = { list: [], details: {} }

      // Persist selected time for “Change” flows
      request.yar.set('TimeSelectionMode', payload.time)

      function isFourDigitYear(value) {
        return /^\d{4}$/.test(value)
      }
      function withinRange(year) {
        const n = Number(year)
        return n >= 1973 && n <= new Date().getFullYear()
      }
      function isValidYearRange(startYear, endYear) {
        const yearCount = endYear - startYear + 1
        return yearCount <= 5
      }

      if (!payload.time) {
        errors.list.push({
          text: 'Select an option before continuing',
          href: '#time-ytd'
        })
        errors.details.time = 'Select an option before continuing'
      } else if (payload.time === 'ytd') {
        // YTD requires no validation - just a valid selection
      } else if (payload.time === 'any') {
        const year = (payload[FIELD_ANY_YEAR_INPUT] || '').trim()
        request.yar.set('yearany', year) // persist for change
        if (!year) {
          errors.list.push({ text: MSG_ENTER_YEAR, href: HREF_ANY_YEAR_INPUT })
          errors.details[ERROR_FIELD_ANY_YEAR] = MSG_ENTER_YEAR
        } else if (!isFourDigitYear(year)) {
          errors.list.push({
            text: MSG_FOUR_DIGIT_YEAR_EXAMPLE,
            href: HREF_ANY_YEAR_INPUT
          })
          errors.details[ERROR_FIELD_ANY_YEAR] = MSG_FOUR_DIGIT_YEAR_EXAMPLE
        } else if (!withinRange(year)) {
          const msg = `Year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: HREF_ANY_YEAR_INPUT })
          errors.details[ERROR_FIELD_ANY_YEAR] = msg
        } else {
          // Year is valid
        }
      } else if (payload.time === 'range') {
        const startYear = (payload[FIELD_RANGE_START_YEAR] || '').trim()
        const endYear = (payload[FIELD_RANGE_END_YEAR] || '').trim()
        // persist for change
        request.yar.set('startYear', startYear)
        request.yar.set('endYear', endYear)

        if (!startYear) {
          errors.list.push({
            text: MSG_ENTER_START_YEAR,
            href: HREF_RANGE_START_YEAR
          })
          errors.details[ERROR_FIELD_RANGE_START] = MSG_ENTER_START_YEAR
        } else if (!isFourDigitYear(startYear)) {
          errors.list.push({
            text: MSG_START_YEAR_FOUR_DIGITS,
            href: HREF_RANGE_START_YEAR
          })
          errors.details[ERROR_FIELD_RANGE_START] = MSG_START_YEAR_FOUR_DIGITS
        } else if (!withinRange(startYear)) {
          const msg = `Start year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: HREF_RANGE_START_YEAR })
          errors.details[ERROR_FIELD_RANGE_START] = msg
        } else {
          // Start year is valid
        }

        if (!endYear) {
          errors.list.push({
            text: MSG_ENTER_END_YEAR,
            href: HREF_RANGE_END_YEAR
          })
          errors.details[ERROR_FIELD_RANGE_END] = MSG_ENTER_END_YEAR
        } else if (!isFourDigitYear(endYear)) {
          errors.list.push({
            text: MSG_END_YEAR_FOUR_DIGITS,
            href: HREF_RANGE_END_YEAR
          })
          errors.details[ERROR_FIELD_RANGE_END] = MSG_END_YEAR_FOUR_DIGITS
        } else if (!withinRange(endYear)) {
          const msg = `End year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: HREF_RANGE_END_YEAR })
          errors.details['range-end'] = msg
        } else {
          // End year is valid
        }

        if (
          startYear &&
          endYear &&
          isFourDigitYear(startYear) &&
          isFourDigitYear(endYear)
        ) {
          const start = Number(startYear)
          const end = Number(endYear)
          if (start > end) {
            errors.list.push({
              text: MSG_START_BEFORE_END,
              href: HREF_RANGE_START_YEAR
            })
            errors.details[ERROR_FIELD_RANGE_START] = MSG_START_BEFORE_END
            errors.list.push({
              text: MSG_END_AFTER_START,
              href: HREF_RANGE_END_YEAR
            })
            errors.details[ERROR_FIELD_RANGE_END] = MSG_END_AFTER_START
          } else if (!isValidYearRange(start, end)) {
            errors.list.push({
              text: MSG_MAX_FIVE_YEARS,
              href: HREF_RANGE_START_YEAR
            })
            errors.list.push({
              text: MSG_MAX_FIVE_YEARS,
              href: HREF_RANGE_END_YEAR
            })
            errors.details[ERROR_FIELD_RANGE_START] = MSG_MAX_FIVE_YEARS
            errors.details[ERROR_FIELD_RANGE_END] = MSG_MAX_FIVE_YEARS
          } else {
            // Year range is valid
          }
        }
      } else {
        // Invalid time selection
        errors.list.push({
          text: 'Select a valid option',
          href: '#time-ytd'
        })
        errors.details.time = 'Select a valid option'
      }

      if (errors.list.length > 0) {
        request.yar.set('yearFormErrors', errors)
        request.yar.set('yearFormData', payload)
        return h.view(VIEW_PATH, {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          errors,
          formData: payload
        })
      }

      // Success: clear transient errors/data
      request.yar.clear('yearFormErrors')
      request.yar.clear('yearFormData')

      // Build time period (unchanged)
      const today = new Date()
      const currentYear = today.getFullYear()
      const formattedToday = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(today)

      let timePeriod = 'None selected'
      if (payload.time === 'ytd') {
        timePeriod = `${JANUARY_FIRST} to ${formattedToday}`
      } else if (payload.time === 'any') {
        const year = Number(payload[FIELD_ANY_YEAR_INPUT])
        timePeriod =
          year === currentYear
            ? `${JANUARY_FIRST} to ${formattedToday}`
            : `${JANUARY_FIRST} to ${DECEMBER_THIRTY_FIRST} ${year}`
      } else if (payload.time === 'range') {
        const startYear = Number(payload[FIELD_RANGE_START_YEAR])
        const endYear = Number(payload[FIELD_RANGE_END_YEAR])
        timePeriod =
          endYear === currentYear
            ? `${JANUARY_FIRST} ${startYear} to ${formattedToday}`
            : `${JANUARY_FIRST} ${startYear} to ${DECEMBER_THIRTY_FIRST} ${endYear}`
      }
      // else: timePeriod remains 'None selected' for any other case

      request.yar.set('selectedTimePeriod', timePeriod)
      return h.redirect('/customdataset')
    } else {
      // Fallback: GET by default
      return h.redirect('/year-aurn')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
