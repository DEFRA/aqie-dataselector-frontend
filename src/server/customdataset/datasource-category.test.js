import {
  OTHERONLY,
  inferDatasourceCategoryTypeFromGroups,
  getDatasourceCategoryType,
  isLast7DaysSelection,
  shouldShowOtherOnlyTimePeriodError,
  setDownloadDatasourceOverrideForLast7Days,
  isZoneSelection,
  shouldShowZoneWarning,
  shouldShowZoneOtherOnlyError,
  setDownloadDatasourceOverrideForZones
} from './datasource-category.js'

const AURN_GROUP = {
  category: 'Near real-time data from Defra',
  networks: [{ id: 'aurn' }]
}
const OTHER_GROUP = {
  category: 'Other data from Defra',
  networks: [{ id: 'ukeap' }]
}

// Request with a session backed by a plain object
function makeRequest(session = {}) {
  return {
    yar: {
      get: jest.fn((key) => session[key]),
      set: jest.fn((key, value) => {
        session[key] = value
      })
    }
  }
}

describe('inferDatasourceCategoryTypeFromGroups', () => {
  it.each([
    ['both', [AURN_GROUP, OTHER_GROUP]],
    ['near-realtime-only', [AURN_GROUP]],
    ['other-only', [OTHER_GROUP]],
    ['unknown', []],
    ['unknown', [{ category: 'Something else' }]]
  ])('returns %s', (expected, groups) => {
    expect(inferDatasourceCategoryTypeFromGroups(groups)).toBe(expected)
  })

  it('ignores case and surrounding spaces in category names', () => {
    expect(
      inferDatasourceCategoryTypeFromGroups([
        { category: '  NEAR REAL-TIME DATA FROM DEFRA ' }
      ])
    ).toBe('near-realtime-only')
  })

  it('treats a non-array or missing categories as unknown', () => {
    expect(inferDatasourceCategoryTypeFromGroups(null)).toBe('unknown')
    expect(inferDatasourceCategoryTypeFromGroups([null, {}])).toBe('unknown')
  })

  it('exports the other-only constant', () => {
    expect(OTHERONLY).toBe('other-only')
  })
})

describe('getDatasourceCategoryType', () => {
  it('accepts a groups array', () => {
    expect(getDatasourceCategoryType([AURN_GROUP])).toBe('near-realtime-only')
  })

  it('reads datasourceGroups from the request session', () => {
    const request = makeRequest({ datasourceGroups: [OTHER_GROUP] })
    expect(getDatasourceCategoryType(request)).toBe('other-only')
  })

  it('returns unknown when the session has no groups', () => {
    expect(getDatasourceCategoryType(makeRequest())).toBe('unknown')
    expect(getDatasourceCategoryType(undefined)).toBe('unknown')
  })
})

describe('isLast7DaysSelection', () => {
  it.each([
    [{ TimeSelectionMode: 'last7days' }, true],
    [{ TimeSelectionMode: 'Last 7 days' }, true],
    [{ TimeSelectionMode: 'last_7-days' }, true],
    [{ selectedyear: 'Last 7 days' }, true],
    [{ TimeSelectionMode: 'year', selectedyear: '2024' }, false],
    [{}, false]
  ])('session %j → %s', (session, expected) => {
    expect(isLast7DaysSelection(makeRequest(session))).toBe(expected)
  })
})

describe('shouldShowOtherOnlyTimePeriodError', () => {
  const base = {
    selectedlocation: ['England'],
    TimeSelectionMode: 'last7days',
    datasourceGroups: [OTHER_GROUP]
  }

  it('is true for other-only + last 7 days + a location', () => {
    expect(shouldShowOtherOnlyTimePeriodError(makeRequest(base))).toBe(true)
  })

  it('accepts a single location string', () => {
    expect(
      shouldShowOtherOnlyTimePeriodError(
        makeRequest({ ...base, selectedlocation: 'England' })
      )
    ).toBe(true)
  })

  it.each([
    ['no location', { selectedlocation: [] }],
    ['empty location string', { selectedlocation: '' }],
    ['not last 7 days', { TimeSelectionMode: 'year' }],
    ['both datasource types', { datasourceGroups: [AURN_GROUP, OTHER_GROUP] }],
    ['no datasource groups', { datasourceGroups: undefined }]
  ])('is false with %s', (_label, overrides) => {
    expect(
      shouldShowOtherOnlyTimePeriodError(makeRequest({ ...base, ...overrides }))
    ).toBe(false)
  })
})

describe('setDownloadDatasourceOverrideForLast7Days', () => {
  it('forces the AURN-only download for both + last 7 days', () => {
    const session = {
      TimeSelectionMode: 'last7days',
      datasourceGroups: [AURN_GROUP, OTHER_GROUP]
    }

    setDownloadDatasourceOverrideForLast7Days(makeRequest(session))

    expect(session).toMatchObject({
      downloadDatasourceGroups: [AURN_GROUP],
      downloadDatasourceCategoryType: 'near-realtime-only',
      downloadForceNearRealtimeOnly: true,
      selectedDatasourceType: 'AURN'
    })
  })

  it('keeps all groups and no override for both outside last 7 days', () => {
    const groups = [AURN_GROUP, OTHER_GROUP]
    const session = { TimeSelectionMode: 'year', datasourceGroups: groups }

    setDownloadDatasourceOverrideForLast7Days(makeRequest(session))

    expect(session).toMatchObject({
      downloadDatasourceGroups: groups,
      downloadDatasourceCategoryType: 'both',
      downloadForceNearRealtimeOnly: false
    })
    expect(session.selectedDatasourceType).toBeUndefined()
  })

  it('handles a session with no datasource groups', () => {
    const session = { TimeSelectionMode: 'last7days' }

    setDownloadDatasourceOverrideForLast7Days(makeRequest(session))

    expect(session).toMatchObject({
      downloadDatasourceGroups: [],
      downloadDatasourceCategoryType: 'unknown',
      downloadForceNearRealtimeOnly: false
    })
  })
})

describe('zones', () => {
  const zoneSession = (datasourceGroups, extra = {}) => ({
    Location: 'Zone',
    selectedlocation: ['Greater London'],
    datasourceGroups,
    ...extra
  })

  describe('isZoneSelection', () => {
    it.each([
      ['Zone', true],
      ['Country', false],
      ['LocalAuthority', false],
      [undefined, false]
    ])('Location %s → %s', (location, expected) => {
      expect(isZoneSelection(makeRequest({ Location: location }))).toBe(
        expected
      )
    })
  })

  describe('shouldShowZoneWarning', () => {
    it('is true for a zone with both datasource types', () => {
      expect(
        shouldShowZoneWarning(
          makeRequest(zoneSession([AURN_GROUP, OTHER_GROUP]))
        )
      ).toBe(true)
    })

    it.each([
      ['AURN only', [AURN_GROUP]],
      ['other data only', [OTHER_GROUP]],
      ['no groups', undefined]
    ])('is false for a zone with %s', (_label, groups) => {
      expect(shouldShowZoneWarning(makeRequest(zoneSession(groups)))).toBe(
        false
      )
    })

    it('is false for countries with both datasource types', () => {
      expect(
        shouldShowZoneWarning(
          makeRequest({
            Location: 'Country',
            datasourceGroups: [AURN_GROUP, OTHER_GROUP]
          })
        )
      ).toBe(false)
    })
  })

  describe('shouldShowZoneOtherOnlyError', () => {
    it('is true for a zone with other data only', () => {
      expect(
        shouldShowZoneOtherOnlyError(makeRequest(zoneSession([OTHER_GROUP])))
      ).toBe(true)
    })

    it.each([
      ['AURN only', zoneSession([AURN_GROUP])],
      ['both', zoneSession([AURN_GROUP, OTHER_GROUP])],
      [
        'no location selected',
        zoneSession([OTHER_GROUP], { selectedlocation: [] })
      ],
      [
        'countries with other data only',
        { ...zoneSession([OTHER_GROUP]), Location: 'Country' }
      ]
    ])('is false for %s', (_label, session) => {
      expect(shouldShowZoneOtherOnlyError(makeRequest(session))).toBe(false)
    })
  })

  describe('setDownloadDatasourceOverrideForZones', () => {
    it('forces the AURN-only download for a zone with both types', () => {
      const session = zoneSession([AURN_GROUP, OTHER_GROUP])

      setDownloadDatasourceOverrideForZones(makeRequest(session))

      expect(session).toMatchObject({
        downloadDatasourceGroups: [AURN_GROUP],
        downloadDatasourceCategoryType: 'near-realtime-only',
        downloadForceNearRealtimeOnly: true,
        selectedDatasourceType: 'AURN'
      })
    })

    it.each([
      ['a zone with AURN only', zoneSession([AURN_GROUP])],
      ['a zone with other data only', zoneSession([OTHER_GROUP])],
      [
        'countries with both types',
        { ...zoneSession([AURN_GROUP, OTHER_GROUP]), Location: 'Country' }
      ]
    ])('changes nothing for %s', (_label, session) => {
      const request = makeRequest(session)

      setDownloadDatasourceOverrideForZones(request)

      expect(request.yar.set).not.toHaveBeenCalled()
    })
  })
})
