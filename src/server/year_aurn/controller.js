/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const yearController = {
  handler(request, h) {
    const backUrl = '/customdataset'
    const MIN_YEAR = 1973
    const MAX_YEAR = 2025

    // Clear session data on GET requests only (but preserve time period selections)
    if (request.method === 'get') {
      request.yar.set('searchQuery', null)
      request.yar.set('fullSearchQuery', null)
      request.yar.set('searchLocation', '')
      request.yar.set('osnameapiresult', '')
      request.yar.set('selectedLocation', '')
      request.yar.set('nooflocation', '')
      request.yar.set('yearselected', '2024')
      request.yar.set('selectedYear', '2025')
      // Don't clear selectedTimePeriod - keep it for form pre-population
    }

    // Handle GET request
    if (request.method === 'get') {
      // Get existing time period from session for form pre-population
      const existingTimePeriod = request.yar.get('selectedTimePeriod') || ''

      // Parse existing time period to determine form values
      const formData = {}
      if (existingTimePeriod) {
        const currentYear = new Date().getFullYear()
        const today = new Date()
        const formattedToday = new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(today)

        if (existingTimePeriod === `1 January to ${formattedToday}`) {
          formData.time = 'ytd'
        } else if (existingTimePeriod.includes(' to ')) {
          const parts = existingTimePeriod.split(' to ')
          if (parts.length === 2) {
            const startPart = parts[0].trim()
            const endPart = parts[1].trim()

            // Check if it's a single year
            if (
              startPart.startsWith('1 January') &&
              endPart.includes('31 December')
            ) {
              const yearMatch = endPart.match(/31 December (\d{4})/)
              if (yearMatch) {
                formData.time = 'any'
                formData['any-year-input'] = yearMatch[1]
              }
            }
            // Check if it's a year range
            else if (
              startPart.match(/1 January (\d{4})/) &&
              (endPart.includes('31 December') || endPart.includes(currentYear))
            ) {
              const startYearMatch = startPart.match(/1 January (\d{4})/)
              let endYear
              if (endPart.includes('31 December')) {
                const endYearMatch = endPart.match(/31 December (\d{4})/)
                endYear = endYearMatch ? endYearMatch[1] : null
              } else {
                endYear = currentYear.toString()
              }

              if (startYearMatch && endYear) {
                formData.time = 'range'
                formData['range-start-year'] = startYearMatch[1]
                formData['range-end-year'] = endYear
              }
            }
          }
        }
      }

      return h.view('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl,
        formData
      })
    }

    // Handle POST request - Server-side validation and processing
    if (request.method === 'post') {
      const payload = request.payload
      const errors = { list: [], details: {} }

      // Helper functions for validation
      function isFourDigitYear(value) {
        return /^\d{4}$/.test(value)
      }

      function withinRange(year) {
        const n = Number(year)
        return n >= MIN_YEAR && n <= MAX_YEAR
      }

      function isValidYearRange(startYear, endYear) {
        const yearCount = endYear - startYear + 1
        return yearCount <= 5
      }

      function getCurrentDate() {
        const today = new Date()
        return new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(today)
      }

      // Validate time selection (radio button)
      if (!payload.time) {
        errors.list.push({
          text: 'Select an option before continuing',
          href: '#time-ytd'
        })
        errors.details.time = 'Select an option before continuing'
      } else {
        // Validate based on selected option
        if (payload.time === 'any') {
          const year = (payload['any-year-input'] || '').trim()

          if (!year) {
            errors.list.push({
              text: 'Enter a year.',
              href: '#any-year-input'
            })
            errors.details['any-year'] = 'Enter a year.'
          } else if (!isFourDigitYear(year)) {
            errors.list.push({
              text: 'Enter a 4-digit year, for example 2009.',
              href: '#any-year-input'
            })
            errors.details['any-year'] =
              'Enter a 4-digit year, for example 2009.'
          } else if (!withinRange(year)) {
            errors.list.push({
              text: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
              href: '#any-year-input'
            })
            errors.details['any-year'] =
              `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`
          }
        } else if (payload.time === 'range') {
          const startYear = (payload['range-start-year'] || '').trim()
          const endYear = (payload['range-end-year'] || '').trim()

          if (!startYear) {
            errors.list.push({
              text: 'Enter a start year.',
              href: '#range-start-year'
            })
            errors.details['range-start'] = 'Enter a start year.'
          } else if (!isFourDigitYear(startYear)) {
            errors.list.push({
              text: 'Start year must be 4 digits, for example 2009.',
              href: '#range-start-year'
            })
            errors.details['range-start'] =
              'Start year must be 4 digits, for example 2009.'
          } else if (!withinRange(startYear)) {
            errors.list.push({
              text: `Start year must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
              href: '#range-start-year'
            })
            errors.details['range-start'] =
              `Start year must be between ${MIN_YEAR} and ${MAX_YEAR}.`
          }

          if (!endYear) {
            errors.list.push({
              text: 'Enter an end year.',
              href: '#range-end-year'
            })
            errors.details['range-end'] = 'Enter an end year.'
          } else if (!isFourDigitYear(endYear)) {
            errors.list.push({
              text: 'End year must be 4 digits, for example 2010.',
              href: '#range-end-year'
            })
            errors.details['range-end'] =
              'End year must be 4 digits, for example 2010.'
          } else if (!withinRange(endYear)) {
            errors.list.push({
              text: `End year must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
              href: '#range-end-year'
            })
            errors.details['range-end'] =
              `End year must be between ${MIN_YEAR} and ${MAX_YEAR}.`
          }

          // Cross-validation for range
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
                href: '#range-start-year'
              })
              errors.details['range-start'] =
                'Start year must be the same as or before the end year.'
              errors.list.push({
                text: 'End year must be the same as or after the start year.',
                href: '#range-end-year'
              })
              errors.details['range-end'] =
                'End year must be the same as or after the start year.'
            } else if (!isValidYearRange(start, end)) {
              errors.list.push({
                text: 'Choose up to 5 whole years at a time',
                href: '#range-start-year'
              })
              errors.details['range-start'] =
                'Choose up to 5 whole years at a time'
            }
          }
        }
      }

      // If validation fails, return to form with errors and preserve form state
      if (errors.list.length > 0) {
        return h.view('year_aurn/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          errors,
          formData: payload
        })
      }

      // If validation passes, process the data and create time period string
      let timePeriod = 'None selected'
      const today = new Date()
      const currentYear = today.getFullYear()
      const formattedToday = getCurrentDate()

      if (payload.time === 'ytd') {
        timePeriod = `1 January to ${formattedToday}`
      } else if (payload.time === 'any') {
        const year = Number(payload['any-year-input'])
        if (year === currentYear) {
          timePeriod = `1 January to ${formattedToday}`
        } else {
          timePeriod = `1 January to 31 December ${year}`
        }
      } else if (payload.time === 'range') {
        const startYear = Number(payload['range-start-year'])
        const endYear = Number(payload['range-end-year'])
        if (endYear === currentYear) {
          timePeriod = `1 January ${startYear} to ${formattedToday}`
        } else {
          timePeriod = `1 January ${startYear} to 31 December ${endYear}`
        }
      }

      // Store in session and redirect
      request.yar.set('selectedTimePeriod', timePeriod)
      return h.redirect('/customdataset')
    }

    // Default fallback
    return h.view('year_aurn/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: backUrl
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
