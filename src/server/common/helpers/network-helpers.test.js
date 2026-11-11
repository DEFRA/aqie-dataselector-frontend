import {
  getNonAurnNetworkIdCsv,
  getNearRealtimeNetworks,
  hasAurnNetwork,
  hasNonAurnNearRealtimeNetwork,
  getAurnOnlyNearRealtimeGroups,
  getDownloadNearRealtimeNetworks,
  getAurnPollutantIds
} from './network-helpers.js'

const NEAR_REALTIME = 'Near real-time data from Defra'
const OTHER = 'Other data from Defra'

const AURN = {
  name: 'Automatic Urban and Rural Network (AURN)',
  pollutantID: '1'
}
const AHC = { name: 'Automatic Hydrocarbon Network', pollutantID: '2' }

describe('hasNonAurnNearRealtimeNetwork', () => {
  it('is true when another near real-time network is listed with AURN', () => {
    expect(
      hasNonAurnNearRealtimeNetwork([
        { category: NEAR_REALTIME, networks: [AURN, AHC] }
      ])
    ).toBe(true)
  })

  it.each([
    ['AURN only', [{ category: NEAR_REALTIME, networks: [AURN] }]],
    ['other data only', [{ category: OTHER, networks: [AHC] }]],
    ['a near real-time group without networks', [{ category: NEAR_REALTIME }]],
    ['no groups', undefined]
  ])('is false for %s', (_label, groups) => {
    expect(hasNonAurnNearRealtimeNetwork(groups)).toBe(false)
  })
})

describe('getAurnOnlyNearRealtimeGroups', () => {
  it('keeps only the near real-time group with its AURN networks', () => {
    expect(
      getAurnOnlyNearRealtimeGroups([
        { category: NEAR_REALTIME, networks: [AHC, AURN] },
        { category: OTHER, networks: [{ id: 'ukeap' }] }
      ])
    ).toEqual([{ category: NEAR_REALTIME, networks: [AURN] }])
  })

  it('handles a group without networks and no groups', () => {
    expect(getAurnOnlyNearRealtimeGroups([{ category: NEAR_REALTIME }])).toEqual(
      [{ category: NEAR_REALTIME, networks: [] }]
    )
    expect(getAurnOnlyNearRealtimeGroups(undefined)).toEqual([])
  })
})

describe('getDownloadNearRealtimeNetworks', () => {
  const stationCounts = [
    { name: AHC.name, isAurn: false, count: 3 },
    { name: AURN.name, isAurn: true, count: 5 }
  ]
  const makeRequest = (session) => ({ yar: { get: (key) => session[key] } })

  it.each(['Zone', 'Agglomeration'])(
    'keeps only AURN networks and counts for %s',
    (location) => {
      expect(
        getDownloadNearRealtimeNetworks(
          makeRequest({
            Location: location,
            datasourceGroups: [{ category: NEAR_REALTIME, networks: [AHC, AURN] }],
            nearRealtimeStationCounts: stationCounts
          })
        )
      ).toEqual({
        networks: [{ name: AURN.name, isAurn: true }],
        stationCounts: [stationCounts[1]]
      })
    }
  )

  it('keeps every network and count for other locations', () => {
    expect(
      getDownloadNearRealtimeNetworks(
        makeRequest({
          Location: 'Country',
          datasourceGroups: [{ category: NEAR_REALTIME, networks: [AHC, AURN] }],
          nearRealtimeStationCounts: stationCounts
        })
      )
    ).toEqual({
      networks: [
        { name: AHC.name, isAurn: false },
        { name: AURN.name, isAurn: true }
      ],
      stationCounts
    })
  })

  it('leaves non-array station counts unchanged for a zone', () => {
    expect(
      getDownloadNearRealtimeNetworks(makeRequest({ Location: 'Zone' }))
    ).toEqual({ networks: [], stationCounts: undefined })
  })
})

describe('getAurnPollutantIds', () => {
  it('returns unique, trimmed AURN pollutant IDs only', () => {
    expect(
      getAurnPollutantIds([
        {
          category: NEAR_REALTIME,
          networks: [
            { ...AURN, pollutantID: ' 1, 3,1,' },
            { abbreviation: 'AURN', pollutantID: '4' },
            AHC,
            'AURN'
          ]
        },
        { category: OTHER, networks: [{ ...AURN, pollutantID: '9' }] }
      ])
    ).toEqual(['1', '3', '4'])
  })

  it.each([
    ['an AURN network without a pollutant ID', [{ category: NEAR_REALTIME, networks: [{ name: AURN.name }] }]],
    ['a near real-time group without networks', [{ category: NEAR_REALTIME }]],
    ['no groups', undefined]
  ])('returns an empty list for %s', (_label, groups) => {
    expect(getAurnPollutantIds(groups)).toEqual([])
  })
})

describe('getNearRealtimeNetworks', () => {
  it('returns the near real-time networks from the datasource API', () => {
    const groups = [
      {
        category: NEAR_REALTIME,
        networks: [
          { name: 'Automatic Urban and Rural Network (AURN)' },
          { name: 'Automatic Hydrocarbon Network', id: 7 }
        ]
      },
      { category: OTHER, networks: [{ name: 'PAH Andersen', id: 3 }] }
    ]

    expect(getNearRealtimeNetworks(groups)).toEqual([
      { name: 'Automatic Urban and Rural Network (AURN)', isAurn: true },
      { name: 'Automatic Hydrocarbon Network', isAurn: false }
    ])
  })

  it('returns only Automatic Hydrocarbon for a hydrocarbon pollutant', () => {
    expect(
      getNearRealtimeNetworks([
        {
          category: NEAR_REALTIME,
          networks: [{ name: 'Automatic Hydrocarbon Network' }]
        }
      ])
    ).toEqual([{ name: 'Automatic Hydrocarbon Network', isAurn: false }])
  })

  it.each(['AURN', 'Automatic Urban and Rural Network', 'aurn'])(
    'recognises %s as AURN',
    (name) => {
      expect(
        getNearRealtimeNetworks([{ category: NEAR_REALTIME, networks: [name] }])
      ).toEqual([{ name, isAurn: true }])
    }
  )

  it('accepts network names as strings, trims them and removes duplicates', () => {
    expect(
      getNearRealtimeNetworks([
        {
          category: NEAR_REALTIME,
          networks: [
            ' Automatic Hydrocarbon Network ',
            { name: 'Automatic Hydrocarbon Network' },
            null,
            { id: 9 }
          ]
        }
      ])
    ).toEqual([{ name: 'Automatic Hydrocarbon Network', isAurn: false }])
  })

  it.each([
    ['no groups', []],
    ['not an array', undefined],
    ['only other data', [{ category: OTHER, networks: [{ name: 'PAH' }] }]],
    ['networks missing', [{ category: NEAR_REALTIME }]]
  ])('returns an empty list for %s', (_label, groups) => {
    expect(getNearRealtimeNetworks(groups)).toEqual([])
  })
})

describe('getNonAurnNetworkIdCsv', () => {
  it('returns unique other-data network IDs as CSV', () => {
    expect(
      getNonAurnNetworkIdCsv([
        { category: NEAR_REALTIME, networks: [{ name: 'AHC', id: 7 }] },
        {
          category: OTHER,
          networks: [{ id: 3 }, { id: ' 5 ' }, { id: 3 }, { id: '' }, 'X']
        }
      ])
    ).toBe('3,5')
  })

  it('returns an empty string when there is no other data group', () => {
    expect(getNonAurnNetworkIdCsv(undefined)).toBe('')
  })
})

describe('hasAurnNetwork', () => {
  it.each([
    ['name', { name: 'Automatic Urban and Rural Network (AURN)' }],
    ['abbreviation', { abbreviation: 'aurn' }],
    ['fullName', { fullName: 'Automatic Urban and Rural Network' }],
    ['string', 'AURN']
  ])('is true when AURN is matched by %s', (_label, network) => {
    expect(
      hasAurnNetwork([{ category: NEAR_REALTIME, networks: [network] }])
    ).toBe(true)
  })

  it('is true when AURN is listed with other near real-time networks', () => {
    expect(
      hasAurnNetwork([
        {
          category: NEAR_REALTIME,
          networks: [
            { name: 'Automatic Urban and Rural Network (AURN)' },
            { name: 'Automatic Hydrocarbon Network' }
          ]
        },
        {
          category: OTHER,
          networks: [{ name: 'UKEAP: Acid Gas and Aerosol Network' }]
        }
      ])
    ).toBe(true)
  })

  it.each([
    [
      'only non-AURN near real-time networks',
      [
        {
          category: NEAR_REALTIME,
          networks: [
            { name: 'Automatic Hydrocarbon Network', abbreviation: 'AHC' }
          ]
        }
      ]
    ],
    [
      'only other data',
      [
        {
          category: OTHER,
          networks: [{ name: 'UKEAP: Acid Gas and Aerosol Network' }]
        }
      ]
    ],
    [
      'an AURN name outside the near real-time group',
      [
        {
          category: OTHER,
          networks: [{ name: 'Automatic Urban and Rural Network (AURN)' }]
        }
      ]
    ],
    ['a near real-time group without networks', [{ category: NEAR_REALTIME }]],
    ['no groups', undefined]
  ])('is false for %s', (_label, groups) => {
    expect(hasAurnNetwork(groups)).toBe(false)
  })
})
