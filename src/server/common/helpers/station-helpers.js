import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
import {
  YEAR_2017,
  YEAR_2018
} from '~/src/server/common/constants/magic-numbers.js'

const FORMAT_HOURS = 12

/**
 * Formats an ISO date string into a human-readable time/date string.
 * @param {string} apiDate
 * @returns {string}
 */
export function parseDateFormat(apiDate) {
  const date = new Date(apiDate)
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const ampm = hours >= FORMAT_HOURS ? 'pm' : 'am'
  const formattedHours = hours % FORMAT_HOURS || FORMAT_HOURS
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
  const day = date.getUTCDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  return `${formattedHours}:${formattedMinutes} ${ampm} on ${day} ${month} ${date.getUTCFullYear()}`
}

/**
 * Returns the toggletip text for a given site type.
 * @param {string} siteType
 * @returns {string|null}
 */
export function getToggletip(siteType) {
  const tips = english.stationdetails.maptoggletips
  const map = {
    'Urban Traffic': tips.Urban_traffic,
    'Urban Industrial': tips.Urban_industrial,
    'Suburban Industrial': tips.Suburban_industrial,
    'Suburban Background': tips.Suburban_background,
    'Rural Background': tips.Rural_background,
    'Urban Background': tips.Urban_background
  }
  return map[siteType] ?? null
}

/**
 * Calls the download API with the given parameters.
 * @param {object} apiParameters
 * @param {object} logger
 * @returns {Promise<any>}
 */
export async function invokeDownload(apiParameters, logger) {
  try {
    const response = await axios.post(config.get('Download_URL'), apiParameters)
    return response.data
  } catch (error) {
    logger.error('Download API failed:', error)
    return error
  }
}

/**
 * Calls the table data API.
 * @param {object} params
 * @returns {Promise<any>}
 */
export async function invokeTable(params) {
  try {
    const response = await axios.post(config.get('Table_URL'), params)
    return response.data
  } catch (error) {
    return error
  }
}

/**
 * Builds a Google Maps URL from coordinates.
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
export function buildMapLocation(lat, lon) {
  return `https://www.google.co.uk/maps?q=${lat},${lon}`
}

/**
 * Generates an array of years from 2018 to the current year.
 * @returns {number[]}
 */
export function buildYearsArray() {
  const currentYear = new Date().getFullYear()
  return Array.from(
    { length: currentYear - YEAR_2017 },
    (_, i) => YEAR_2018 + i
  )
}

/**
 * Formats today's date as "D Month".
 * @returns {string}
 */
export function formatCurrentDate() {
  const today = new Date()
  return `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'long' })}`
}
