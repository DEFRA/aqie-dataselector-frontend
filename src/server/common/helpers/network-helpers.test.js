import {
  getNonAurnNetworkIdCsv,
  getNearRealtimeNetworks,
  hasAurnNetwork
} from './network-helpers.js'

const NEAR_REALTIME = 'Near real-time data from Defra'
const OTHER = 'Other data from Defra'

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
