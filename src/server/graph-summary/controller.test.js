import { graphSummaryController } from '~/src/server/graph-summary/controller.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'
import { resolveStationHistory } from '~/src/server/common/helpers/station-helpers.js'

jest.mock('~/src/server/common/helpers/navigation-helpers.js')
jest.mock('~/src/server/common/helpers/station-helpers.js', () => ({
  resolveStationHistory: jest.fn()
}))

// The windows are as resolveStationHistory returns them: the time each end hour began.
const ROW = {
  pollutantName: 'PM2.5',
  dataCapturePercentage: 100,
  lowDataCapture: false,
  average: 12,
  dailyCount: 'no legal limit',
  hourlyCount: 'no legal limit'
}
const LAST_24_HOURS = {
  periodStart: '2026-09-20T12:00:00.000Z',
  periodEnd: '2026-09-21T11:00:00.000Z',
  pollutants: [ROW]
}
const LAST_7_DAYS = {
  periodStart: '2026-09-14T00:00:00.000Z',
  periodEnd: '2026-09-20T23:00:00.000Z',
  pollutants: [ROW]
}

describe('graphSummaryController.handler', () => {
  const station = {
    id: 'BirminghamA4540Roadside',
    name: 'Birmingham A4540 Roadside',
    siteId: 'UKA00315'
  }
  const otherStation = { id: 'LondonMarylebone', name: 'London Marylebone' }

  let h
  let session

  const buildRequest = (query) => ({
    query,
    yar: { get: jest.fn((key) => session[key]), set: jest.fn() }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    h = { view: jest.fn().mockReturnValue('view-response') }
    session = {
      MonitoringstResult: { getmonitoringstation: [otherStation, station] }
    }
    renderNotFound.mockReturnValue('not-found-response')
    resolveStationHistory.mockImplementation((_station, period) =>
      Promise.resolve(period === '7d' ? LAST_7_DAYS : LAST_24_HOURS)
    )
  })

  it('renders the last 24 hours for the station', async () => {
    const result = await graphSummaryController.handler(
      buildRequest({
        stationId: station.id,
        period: 'last24hours',
        nojs: false
      }),
      h
    )

    expect(result).toBe('view-response')
    expect(h.view).toHaveBeenCalledWith('graph-summary/index', {
      pageTitle: 'Last 24 hours: Birmingham A4540 Roadside',
      heading: 'Last 24 hours: Birmingham A4540 Roadside',
      dates: '21 September 2026',
      periodNavigationLabel: 'Time period',
      periodTabs: [
        {
          label: 'Last 24 hours',
          href: '/stationdetails/graph-summary?stationId=BirminghamA4540Roadside&period=last24hours',
          isCurrent: true
        },
        {
          label: 'Last 7 days',
          href: '/stationdetails/graph-summary?stationId=BirminghamA4540Roadside&period=last7days',
          isCurrent: false
        }
      ],
      verificationBanner: 'Data has not been checked and verified',
      summary: {
        title: 'View pollutant summary',
        period: '24h',
        rows: [ROW],
        message: null,
        legalLimits:
          'The pollution levels shown are measured against UK legal limits.'
      },
      displayBacklink: true,
      hrefq: '/stationdetails'
    })
  })

  it('renders the last 7 days for the station', async () => {
    await graphSummaryController.handler(
      buildRequest({
        stationId: station.id,
        period: 'last7days',
        nojs: false
      }),
      h
    )

    expect(h.view).toHaveBeenCalledWith(
      'graph-summary/index',
      expect.objectContaining({
        pageTitle: 'Last 7 days: Birmingham A4540 Roadside',
        heading: 'Last 7 days: Birmingham A4540 Roadside',
        dates: '14 September to 20 September 2026',
        summary: expect.objectContaining({ period: '7d', rows: [ROW] }),
        periodTabs: [
          expect.objectContaining({ label: 'Last 24 hours', isCurrent: false }),
          expect.objectContaining({ label: 'Last 7 days', isCurrent: true })
        ]
      })
    )
  })

  it.each([
    ['last24hours', '24h'],
    ['last7days', '7d']
  ])(
    'gets the history for the %s from the station in the session, as the %s period',
    async (period, historyPeriod) => {
      await graphSummaryController.handler(
        buildRequest({ stationId: station.id, period, nojs: false }),
        h
      )

      expect(resolveStationHistory).toHaveBeenCalledTimes(1)
      expect(resolveStationHistory).toHaveBeenCalledWith(station, historyPeriod)
    }
  )

  it.each([
    ['the history could not be loaded', {}],
    ['the station has no AURN site id', { noMapping: true }],
    ['the history has no readings', { periodStart: null, periodEnd: null }]
  ])(
    'still renders the page, without dates, when %s',
    async (_name, history) => {
      resolveStationHistory.mockResolvedValue(history)

      const result = await graphSummaryController.handler(
        buildRequest({
          stationId: station.id,
          period: 'last7days',
          nojs: false
        }),
        h
      )

      expect(result).toBe('view-response')
      expect(h.view).toHaveBeenCalledWith(
        'graph-summary/index',
        expect.objectContaining({
          heading: 'Last 7 days: Birmingham A4540 Roadside',
          dates: '',
          summary: expect.objectContaining({ rows: [] })
        })
      )
    }
  )

  it('keeps the no-JavaScript journey in the tab links and links Back to the no-JavaScript station page', async () => {
    await graphSummaryController.handler(
      buildRequest({
        stationId: station.id,
        period: 'last24hours',
        nojs: true
      }),
      h
    )

    const view = h.view.mock.calls[0][1]
    expect(view.hrefq).toBe('/stationDetailsNojs/BirminghamA4540Roadside')
    expect(view.periodTabs.map(({ href }) => href)).toEqual([
      '/stationdetails/graph-summary?stationId=BirminghamA4540Roadside&period=last24hours&nojs=true',
      '/stationdetails/graph-summary?stationId=BirminghamA4540Roadside&period=last7days&nojs=true'
    ])
  })

  it('points the session at the station, so Back returns to the same station', async () => {
    const request = buildRequest({
      stationId: station.id,
      period: 'last24hours',
      nojs: false
    })

    await graphSummaryController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('SiteId', station.id)
    expect(request.yar.set).toHaveBeenCalledWith('stationdetails', station)
  })

  describe('when the station is not one the user searched for', () => {
    it('renders the not found page for an unknown station, without asking for any history', async () => {
      const request = buildRequest({
        stationId: 'Unknown',
        period: 'last24hours',
        nojs: false
      })

      const result = await graphSummaryController.handler(request, h)

      expect(result).toBe('not-found-response')
      expect(renderNotFound).toHaveBeenCalledWith(h)
      expect(h.view).not.toHaveBeenCalled()
      expect(resolveStationHistory).not.toHaveBeenCalled()
    })

    it('leaves the session alone', async () => {
      const request = buildRequest({
        stationId: 'Unknown',
        period: 'last24hours',
        nojs: false
      })

      await graphSummaryController.handler(request, h)

      expect(request.yar.set).not.toHaveBeenCalled()
    })

    it.each([
      ['no search results in the session', undefined],
      ['no stations in the search results', {}],
      ['stations that are not a list', { getmonitoringstation: 'nope' }]
    ])('renders the not found page for %s', async (_name, monitoringResult) => {
      session = { MonitoringstResult: monitoringResult }

      const result = await graphSummaryController.handler(
        buildRequest({
          stationId: station.id,
          period: 'last24hours',
          nojs: false
        }),
        h
      )

      expect(result).toBe('not-found-response')
    })
  })
})
