import { graphSummaryController } from '~/src/server/graph-summary/controller.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'

jest.mock('~/src/server/common/helpers/navigation-helpers.js')

describe('graphSummaryController.handler', () => {
  const station = {
    id: 'BirminghamA4540Roadside',
    name: 'Birmingham A4540 Roadside'
  }
  const otherStation = { id: 'LondonMarylebone', name: 'London Marylebone' }

  let h
  let session

  const buildRequest = (query) => ({
    query,
    yar: { get: jest.fn((key) => session[key]), set: jest.fn() }
  })

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-21T10:30:00Z') })
    h = { view: jest.fn().mockReturnValue('view-response') }
    session = {
      MonitoringstResult: { getmonitoringstation: [otherStation, station] }
    }
    renderNotFound.mockReturnValue('not-found-response')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the last 24 hours for the station', () => {
    const result = graphSummaryController.handler(
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
      legalLimits:
        'The pollution levels shown are measured against UK legal limits.',
      displayBacklink: true,
      hrefq: '/stationdetails'
    })
  })

  it('renders the last 7 days for the station', () => {
    graphSummaryController.handler(
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
        dates: '15 September 2026 to 21 September 2026',
        periodTabs: [
          expect.objectContaining({ label: 'Last 24 hours', isCurrent: false }),
          expect.objectContaining({ label: 'Last 7 days', isCurrent: true })
        ]
      })
    )
  })

  it('keeps the no-JavaScript journey in the tab links and links Back to the no-JavaScript station page', () => {
    graphSummaryController.handler(
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

  it('points the session at the station, so Back returns to the same station', () => {
    const request = buildRequest({
      stationId: station.id,
      period: 'last24hours',
      nojs: false
    })

    graphSummaryController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('SiteId', station.id)
    expect(request.yar.set).toHaveBeenCalledWith('stationdetails', station)
  })

  describe('when the station is not one the user searched for', () => {
    it('renders the not found page for an unknown station', () => {
      const request = buildRequest({
        stationId: 'Unknown',
        period: 'last24hours',
        nojs: false
      })

      const result = graphSummaryController.handler(request, h)

      expect(result).toBe('not-found-response')
      expect(renderNotFound).toHaveBeenCalledWith(h)
      expect(h.view).not.toHaveBeenCalled()
    })

    it('leaves the session alone', () => {
      const request = buildRequest({
        stationId: 'Unknown',
        period: 'last24hours',
        nojs: false
      })

      graphSummaryController.handler(request, h)

      expect(request.yar.set).not.toHaveBeenCalled()
    })

    it.each([
      ['no search results in the session', undefined],
      ['no stations in the search results', {}],
      ['stations that are not a list', { getmonitoringstation: 'nope' }]
    ])('renders the not found page for %s', (_name, monitoringResult) => {
      session = { MonitoringstResult: monitoringResult }

      const result = graphSummaryController.handler(
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
