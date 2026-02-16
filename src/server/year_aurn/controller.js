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
        'any-year-input': transientFormData['any-year-input'] || savedAny || '',
        'range-start-year':
          transientFormData['range-start-year'] ||
          savedStart ||
          savedYtdStart ||
          '',
        'range-end-year': transientFormData['range-end-year'] || savedEnd || ''
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
        const year = (payload['any-year-input'] || '').trim()
        request.yar.set('yearany', year) // persist for change
        if (!year) {
          errors.list.push({ text: 'Enter a year.', href: '#any-year-input' })
          errors.details['any-year'] = 'Enter a year.'
        } else if (!isFourDigitYear(year)) {
          errors.list.push({
            text: 'Enter a 4-digit year, for example 2009.',
            href: '#any-year-input'
          })
          errors.details['any-year'] = 'Enter a 4-digit year, for example 2009.'
        } else if (!withinRange(year)) {
          const msg = `Year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: '#any-year-input' })
          errors.details['any-year'] = msg
        }
      } else if (payload.time === 'range') {
        const startYear = (payload['range-start-year'] || '').trim()
        const endYear = (payload['range-end-year'] || '').trim()
        // persist for change
        request.yar.set('startYear', startYear)
        request.yar.set('endYear', endYear)

        if (!startYear) {
          errors.list.push({
            text: 'Enter a start year.',
            href: HREF_RANGE_START_YEAR
          })
          errors.details['range-start'] = 'Enter a start year.'
        } else if (!isFourDigitYear(startYear)) {
          errors.list.push({
            text: 'Start year must be 4 digits, for example 2009.',
            href: HREF_RANGE_START_YEAR
          })
          errors.details['range-start'] =
            'Start year must be 4 digits, for example 2009.'
        } else if (!withinRange(startYear)) {
          const msg = `Start year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: HREF_RANGE_START_YEAR })
          errors.details['range-start'] = msg
        }

        if (!endYear) {
          errors.list.push({
            text: 'Enter an end year.',
            href: HREF_RANGE_END_YEAR
          })
          errors.details['range-end'] = 'Enter an end year.'
        } else if (!isFourDigitYear(endYear)) {
          errors.list.push({
            text: 'End year must be 4 digits, for example 2010.',
            href: HREF_RANGE_END_YEAR
          })
          errors.details['range-end'] =
            'End year must be 4 digits, for example 2010.'
        } else if (!withinRange(endYear)) {
          const msg = `End year must be between 1973 and ${new Date().getFullYear()}.`
          errors.list.push({ text: msg, href: HREF_RANGE_END_YEAR })
          errors.details['range-end'] = msg
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
              text: 'Start year must be the same as or before the end year.',
              href: HREF_RANGE_START_YEAR
            })
            errors.details['range-start'] =
              'Start year must be the same as or before the end year.'
            errors.list.push({
              text: 'End year must be the same as or after the start year.',
              href: HREF_RANGE_END_YEAR
            })
            errors.details['range-end'] =
              'End year must be the same as or after the start year.'
          } else if (!isValidYearRange(start, end)) {
            const msg = 'Choose up to 5 whole years at a time'
            errors.list.push({ text: msg, href: HREF_RANGE_START_YEAR })
            errors.list.push({ text: msg, href: HREF_RANGE_END_YEAR })
            errors.details['range-start'] = msg
            errors.details['range-end'] = msg
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
        const year = Number(payload['any-year-input'])
        timePeriod =
          year === currentYear
            ? `${JANUARY_FIRST} to ${formattedToday}`
            : `${JANUARY_FIRST} to 31 December ${year}`
      } else if (payload.time === 'range') {
        const startYear = Number(payload['range-start-year'])
        const endYear = Number(payload['range-end-year'])
        timePeriod =
          endYear === currentYear
            ? `${JANUARY_FIRST} ${startYear} to ${formattedToday}`
            : `${JANUARY_FIRST} ${startYear} to 31 December ${endYear}`
      }

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
