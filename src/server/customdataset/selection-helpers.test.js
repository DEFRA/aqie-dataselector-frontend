import {
  handlePollutantsFromParams,
  handleTimePeriodSelection,
  handleLocationSelection,
  parseYearRange,
  getPollutantNames
} from '~/src/server/customdataset/selection-helpers.js'

// Request with a session backed by a plain object
function makeRequest(session = {}, extra = {}) {
  return {
    params: {},
    path: '',
    ...extra,
    yar: {
      get: jest.fn((key) => session[key]),
      set: jest.fn((key, value) => {
        session[key] = value
      })
    }
  }
}

describe('handlePollutantsFromParams', () => {
  it('prefers pollutants already in session', () => {
    const session = { selectedPollutants: ['Ozone (O3)'] }
    const request = makeRequest(session, { params: { pollutants: 'core' } })

    handlePollutantsFromParams(request)

    expect(session.selectedpollutant).toEqual(['Ozone (O3)'])
  })

  it('does nothing when there are no session pollutants and no param', () => {
    const request = makeRequest({ selectedPollutants: [] })

    handlePollutantsFromParams(request)

    expect(request.yar.set).not.toHaveBeenCalled()
  })

  it('expands "core" into the five core pollutants', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: 'core' } })
    )

    expect(session.selectedpollutant).toHaveLength(5)
    expect(session.selectedpollutant).toContain('Ozone (O3)')
    expect(session.selectedpollutant).not.toContain('Carbon monoxide (CO)')
  })

  it('expands "compliance" into the eight compliance pollutants', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: 'compliance' } })
    )

    expect(session.selectedpollutant).toHaveLength(8)
    expect(session.selectedpollutant).toContain('Carbon monoxide (CO)')
  })

  it('splits a single comma-separated array entry', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: ['a, b ,c'] } })
    )

    expect(session.selectedpollutant).toEqual(['a', 'b', 'c'])
  })

  it('keeps an array of separate pollutants as-is', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: ['a', 'b'] } })
    )

    expect(session.selectedpollutant).toEqual(['a', 'b'])
  })

  it('splits a comma-separated string', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: 'a , b' } })
    )

    expect(session.selectedpollutant).toEqual(['a', 'b'])
  })

  it('passes through any other value unchanged', () => {
    const session = {}
    handlePollutantsFromParams(
      makeRequest(session, { params: { pollutants: 42 } })
    )

    expect(session.selectedpollutant).toBe(42)
  })
})

describe('handleTimePeriodSelection', () => {
  it('prefers the time period stored in session', () => {
    const session = { selectedTimePeriod: '2020 to 2022' }
    handleTimePeriodSelection(
      makeRequest(session, { path: '/year', params: { year: '2019' } })
    )

    expect(session.selectedyear).toBe('2020 to 2022')
  })

  it('uses the year param on a /year path', () => {
    const session = {}
    handleTimePeriodSelection(
      makeRequest(session, {
        path: '/customdataset/year',
        params: { year: '2019' }
      })
    )

    expect(session.selectedyear).toBe('2019')
  })

  it('does nothing on other paths', () => {
    const request = makeRequest({}, { path: '/customdataset' })

    handleTimePeriodSelection(request)

    expect(request.yar.set).not.toHaveBeenCalled()
  })

  it('copes with a missing path', () => {
    const request = makeRequest({}, { path: undefined })

    expect(() => handleTimePeriodSelection(request)).not.toThrow()
    expect(request.yar.set).not.toHaveBeenCalled()
  })
})

describe('handleLocationSelection', () => {
  it.each(['/customdataset/location', '/other', undefined])(
    'does not touch the session for path %s',
    (path) => {
      const request = makeRequest({}, { path })

      handleLocationSelection(request)

      expect(request.yar.set).not.toHaveBeenCalled()
    }
  )
})

describe('parseYearRange', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('expands a two-year range into every year between', () => {
    const session = {}
    const result = parseYearRange(
      '1 January 2019 to 31 December 2021',
      makeRequest(session)
    )

    expect(result).toBe('2019,2020,2021')
    expect(session).toMatchObject({
      yearrange: 'Multiple',
      finalyear: '2019,2020,2021'
    })
  })

  it('returns a single year', () => {
    const session = {}
    const result = parseYearRange('2022', makeRequest(session))

    expect(result).toBe('2022')
    expect(session).toMatchObject({ yearrange: 'Single', finalyear: '2022' })
  })

  it('returns an empty string when no year is found', () => {
    const request = makeRequest({})

    expect(parseYearRange('no year here', request)).toBe('')
    expect(request.yar.set).not.toHaveBeenCalled()
  })

  it('uses the current year for last 7 days within a single year', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00Z'))
    const session = { TimeSelectionMode: 'last7days' }

    expect(parseYearRange('', makeRequest(session))).toBe('2026')
    expect(session).toMatchObject({ yearrange: 'Single', finalyear: '2026' })
  })

  it('spans two years for last 7 days at the start of January', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-03T12:00:00Z'))
    const session = { selectedyear: 'Last 7 days' }

    expect(parseYearRange('Last 7 days', makeRequest(session))).toBe(
      '2025,2026'
    )
    expect(session).toMatchObject({
      yearrange: 'Multiple',
      finalyear: '2025,2026'
    })
  })
})

describe('getPollutantNames', () => {
  it('maps display names to API names', () => {
    const names = getPollutantNames()

    expect(names['Fine particulate matter (PM2.5)']).toBe('PM2.5')
    expect(names['Nitric oxide (NO)']).toBeNull()
    expect(Object.keys(names)).toHaveLength(8)
  })
})
