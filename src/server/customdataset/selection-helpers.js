import { isLast7DaysSelection } from '~/src/server/customdataset/datasource-category.js'

const DAYS_IN_WEEK_OFFSET = 6

function getCorePollutants() {
  return [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)'
  ]
}

function getCompliancePollutants() {
  return [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)',
    'Nitric oxide (NO)',
    'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
    'Carbon monoxide (CO)'
  ]
}

function parsePollutantArray(selectedpollutant) {
  if (selectedpollutant.length === 1 && selectedpollutant[0].includes(',')) {
    return selectedpollutant[0].split(',').map((s) => s.trim())
  }
  return selectedpollutant
}

function parsePollutantString(selectedpollutant) {
  return selectedpollutant.split(',').map((s) => s.trim())
}

function processPollutantSelection(selectedpollutant) {
  if (selectedpollutant === 'core') {
    return getCorePollutants()
  }

  if (selectedpollutant === 'compliance') {
    return getCompliancePollutants()
  }

  if (Array.isArray(selectedpollutant)) {
    return parsePollutantArray(selectedpollutant)
  }

  if (typeof selectedpollutant === 'string') {
    return parsePollutantString(selectedpollutant)
  }

  return selectedpollutant
}

export function handlePollutantsFromParams(request) {
  const sessionPollutants = request.yar.get('selectedPollutants')
  if (sessionPollutants && sessionPollutants.length > 0) {
    request.yar.set('selectedpollutant', sessionPollutants)
    return
  }

  if (request.params.pollutants === undefined) {
    return
  }

  const selectedpollutant = processPollutantSelection(request.params.pollutants)
  request.yar.set('selectedpollutant', selectedpollutant)
}

export function handleTimePeriodSelection(request) {
  const sessionTimePeriod = request.yar.get('selectedTimePeriod')
  if (sessionTimePeriod) {
    request.yar.set('selectedyear', sessionTimePeriod)
    return
  }

  if (request.path?.includes('/year')) {
    request.yar.set('selectedyear', request.params.year)
  }
}

export function handleLocationSelection(request) {
  if (request.path?.includes('/location')) {
    // Location selection handling logic would go here
  }
}

export function parseYearRange(selectedyear, request) {
  if (isLast7DaysSelection(request)) {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - DAYS_IN_WEEK_OFFSET)

    const startYear = startDate.getFullYear()
    const endYear = today.getFullYear()

    if (startYear === endYear) {
      request.yar.set('yearrange', 'Single')
      const singleYearResult = String(endYear)
      request.yar.set('finalyear', singleYearResult)
      return singleYearResult
    }

    request.yar.set('yearrange', 'Multiple')
    const yearListLast7 = []
    for (let y = startYear; y <= endYear; y++) {
      yearListLast7.push(y)
    }
    const multipleYearResult = yearListLast7.join(',')
    request.yar.set('finalyear', multipleYearResult)
    return multipleYearResult
  }

  const years = selectedyear.match(/\d{4}/g)

  if (years?.length === 2) {
    request.yar.set('yearrange', 'Multiple')
    const start = Number.parseInt(years[0], 10)
    const end = Number.parseInt(years[1], 10)
    const yearList = []
    for (let y = start; y <= end; y++) {
      yearList.push(y)
    }
    const finalyear = yearList.join(',')
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

  if (years?.length === 1) {
    request.yar.set('yearrange', 'Single')
    const finalyear = years[0]
    request.yar.set('finalyear', finalyear)
    return finalyear
  }

  return ''
}

export function getPollutantNames() {
  return {
    'Fine particulate matter (PM2.5)': 'PM2.5',
    'Particulate matter (PM10)': 'PM10',
    'Nitrogen dioxide (NO2)': 'Nitrogen dioxide',
    'Ozone (O3)': 'Ozone',
    'Sulphur dioxide (SO2)': 'Sulphur dioxide',
    'Nitric oxide (NO)': null,
    'Nitrogen oxides as nitrogen dioxide (NOx as NO2)':
      'Nitrogen oxides as nitrogen dioxide',
    'Carbon monoxide (CO)': 'Carbon monoxide'
  }
}
