/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import {
  MIN_YEAR,
  EXAMPLE_YEAR,
  MAX_YEARS_RANGE
} from '~/src/server/common/constants/magic-numbers.js'

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
const MSG_FOUR_DIGIT_YEAR_EXAMPLE = `Enter a 4-digit year, for example ${EXAMPLE_YEAR}.`
const MSG_START_YEAR_FOUR_DIGITS = `Start year must be 4 digits, for example ${EXAMPLE_YEAR}.`
const MSG_END_YEAR_FOUR_DIGITS = 'End year must be 4 digits, for example 2010.'
const MSG_START_BEFORE_END =
  'Start year must be the same as or before the end year.'
const MSG_END_AFTER_START =
  'End year must be the same as or after the start year.'
const MSG_MAX_FIVE_YEARS = 'Choose up to 5 whole years at a time'

const HREF_TIME_YTD = '#time-ytd'
const MSG_SELECT_OPTION = 'Select an option before continuing'
const MSG_SELECT_VALID_OPTION = 'Select a valid option'

function getCurrentYear() {
  return new Date().getFullYear()
}

function isFourDigitYear(value) {
  return /^\d{4}$/.test(value)
}

function withinRange(year) {
  const n = Number(year)
  return n >= MIN_YEAR && n <= getCurrentYear()
}

function isValidYearRange(startYear, endYear) {
  const yearCount = endYear - startYear + 1
  return yearCount <= MAX_YEARS_RANGE
}

function addError(errors, text, href, detailField, detailText = text) {
  errors.list.push({ text, href })
  errors.details[detailField] = detailText
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return ''
}

function getGetFormData(request) {
  const transientFormData = request.yar.get('yearFormData') || {}
  const savedTime = request.yar.get('TimeSelectionMode') || ''
  const savedAny = request.yar.get('yearany') || ''
  const savedStart = request.yar.get('startYear') || ''
  const savedEnd = request.yar.get('endYear') || ''
  const savedYtdStart = request.yar.get('startyear_ytd') || ''

  return {
    time: firstNonEmpty([transientFormData.time, savedTime]),
    [FIELD_ANY_YEAR_INPUT]: firstNonEmpty([
      transientFormData[FIELD_ANY_YEAR_INPUT],
      savedAny
    ]),
    [FIELD_RANGE_START_YEAR]: firstNonEmpty([
      transientFormData[FIELD_RANGE_START_YEAR],
      savedStart,
      savedYtdStart
    ]),
    [FIELD_RANGE_END_YEAR]: firstNonEmpty([
      transientFormData[FIELD_RANGE_END_YEAR],
      savedEnd
    ])
  }
}

function renderYearView(h, backUrl, errors, formData) {
  return h.view(VIEW_PATH, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: backUrl,
    errors,
    formData
  })
}

function handleGetRequest(request, h, backUrl) {
  const errors = request.yar.get('yearFormErrors') || {
    list: [],
    details: {}
  }
  const formData = getGetFormData(request)

  request.yar.clear('yearFormErrors')
  request.yar.clear('yearFormData')

  return renderYearView(h, backUrl, errors, formData)
}

function validateAnyYear(payload, request, errors) {
  const year = (payload[FIELD_ANY_YEAR_INPUT] || '').trim()
  request.yar.set('yearany', year)

  if (!year) {
    addError(
      errors,
      MSG_ENTER_YEAR,
      HREF_ANY_YEAR_INPUT,
      ERROR_FIELD_ANY_YEAR,
      MSG_ENTER_YEAR
    )
    return
  }

  if (!isFourDigitYear(year)) {
    addError(
      errors,
      MSG_FOUR_DIGIT_YEAR_EXAMPLE,
      HREF_ANY_YEAR_INPUT,
      ERROR_FIELD_ANY_YEAR,
      MSG_FOUR_DIGIT_YEAR_EXAMPLE
    )
    return
  }

  if (!withinRange(year)) {
    const msg = `Year must be between ${MIN_YEAR} and ${getCurrentYear()}.`
    addError(errors, msg, HREF_ANY_YEAR_INPUT, ERROR_FIELD_ANY_YEAR, msg)
  }
}

function validateRangeBoundary(
  value,
  requiredMsg,
  fourDigitMsg,
  outOfRangeMsg,
  href,
  detailField,
  errors
) {
  if (!value) {
    addError(errors, requiredMsg, href, detailField, requiredMsg)
    return
  }

  if (!isFourDigitYear(value)) {
    addError(errors, fourDigitMsg, href, detailField, fourDigitMsg)
    return
  }

  if (!withinRange(value)) {
    addError(errors, outOfRangeMsg, href, detailField, outOfRangeMsg)
  }
}

function validateRangeRelationship(startYear, endYear, errors) {
  if (
    !(
      startYear &&
      endYear &&
      isFourDigitYear(startYear) &&
      isFourDigitYear(endYear)
    )
  ) {
    return
  }

  const start = Number(startYear)
  const end = Number(endYear)

  if (start > end) {
    addError(
      errors,
      MSG_START_BEFORE_END,
      HREF_RANGE_START_YEAR,
      ERROR_FIELD_RANGE_START,
      MSG_START_BEFORE_END
    )
    addError(
      errors,
      MSG_END_AFTER_START,
      HREF_RANGE_END_YEAR,
      ERROR_FIELD_RANGE_END,
      MSG_END_AFTER_START
    )
  } else if (isValidYearRange(start, end)) {
    // start <= end and range is valid — no error needed
  } else {
    addError(
      errors,
      MSG_MAX_FIVE_YEARS,
      HREF_RANGE_START_YEAR,
      ERROR_FIELD_RANGE_START,
      MSG_MAX_FIVE_YEARS
    )
    addError(
      errors,
      MSG_MAX_FIVE_YEARS,
      HREF_RANGE_END_YEAR,
      ERROR_FIELD_RANGE_END,
      MSG_MAX_FIVE_YEARS
    )
  }
}

function validateRangeYears(payload, request, errors) {
  const startYear = (payload[FIELD_RANGE_START_YEAR] || '').trim()
  const endYear = (payload[FIELD_RANGE_END_YEAR] || '').trim()

  request.yar.set('startYear', startYear)
  request.yar.set('endYear', endYear)

  validateRangeBoundary(
    startYear,
    MSG_ENTER_START_YEAR,
    MSG_START_YEAR_FOUR_DIGITS,
    `Start year must be between ${MIN_YEAR} and ${getCurrentYear()}.`,
    HREF_RANGE_START_YEAR,
    ERROR_FIELD_RANGE_START,
    errors
  )

  validateRangeBoundary(
    endYear,
    MSG_ENTER_END_YEAR,
    MSG_END_YEAR_FOUR_DIGITS,
    `End year must be between ${MIN_YEAR} and ${getCurrentYear()}.`,
    HREF_RANGE_END_YEAR,
    ERROR_FIELD_RANGE_END,
    errors
  )

  validateRangeRelationship(startYear, endYear, errors)
}

function validatePostPayload(payload, request, errors) {
  if (!payload.time) {
    addError(
      errors,
      MSG_SELECT_OPTION,
      HREF_TIME_YTD,
      'time',
      MSG_SELECT_OPTION
    )
    return
  }

  if (payload.time === 'ytd') {
    return
  }

  if (payload.time === 'any') {
    validateAnyYear(payload, request, errors)
    return
  }

  if (payload.time === 'range') {
    validateRangeYears(payload, request, errors)
    return
  }

  addError(
    errors,
    MSG_SELECT_VALID_OPTION,
    HREF_TIME_YTD,
    'time',
    MSG_SELECT_VALID_OPTION
  )
}

function buildTimePeriod(payload) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const formattedToday = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(today)

  if (payload.time === 'ytd') {
    return `${JANUARY_FIRST} to ${formattedToday}`
  }

  if (payload.time === 'any') {
    const year = Number(payload[FIELD_ANY_YEAR_INPUT])
    return year === currentYear
      ? `${JANUARY_FIRST} to ${formattedToday}`
      : `${JANUARY_FIRST} to ${DECEMBER_THIRTY_FIRST} ${year}`
  }

  if (payload.time === 'range') {
    const startYear = Number(payload[FIELD_RANGE_START_YEAR])
    const endYear = Number(payload[FIELD_RANGE_END_YEAR])
    return endYear === currentYear
      ? `${JANUARY_FIRST} ${startYear} to ${formattedToday}`
      : `${JANUARY_FIRST} ${startYear} to ${DECEMBER_THIRTY_FIRST} ${endYear}`
  }

  return 'None selected'
}

function handlePostRequest(request, h, backUrl) {
  const payload = request.payload || {}
  const errors = { list: [], details: {} }

  request.yar.set('TimeSelectionMode', payload.time)
  validatePostPayload(payload, request, errors)

  if (errors.list.length > 0) {
    request.yar.set('yearFormErrors', errors)
    request.yar.set('yearFormData', payload)
    return renderYearView(h, backUrl, errors, payload)
  }

  request.yar.clear('yearFormErrors')
  request.yar.clear('yearFormData')
  request.yar.set('selectedTimePeriod', buildTimePeriod(payload))
  return h.redirect('/customdataset')
}

export const yearController = {
  handler(request, h) {
    const backUrl = '/customdataset'

    if (request.method === 'get') {
      return handleGetRequest(request, h, backUrl)
    }

    if (request.method === 'post') {
      return handlePostRequest(request, h, backUrl)
    }

    return h.redirect('/year-aurn')
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
