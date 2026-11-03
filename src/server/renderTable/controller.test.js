import { rendertablecontroller } from '~/src/server/renderTable/controller.js'
import axios from 'axios'
import nunjucks from 'nunjucks'
import { config } from '~/src/config/config.js'

jest.mock('axios')
jest.mock('nunjucks')

describe('rendertablecontroller.handler', () => {
  let h, request

  beforeEach(() => {
    h = {
      response: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }
    request = {
      params: { year: 2024 },
      yar: {
        get: jest.fn((key) => {
          if (key === 'stationdetails') return { localSiteID: 'site123' }
          if (key === 'selectedYear') return 2024
          if (key === 'tabledata') return { some: 'data' }
          return undefined
        }),
        set: jest.fn()
      }
    }
    nunjucks.render.mockReturnValue('<table>content</table>')
  })

  it('renders table with valid data', async () => {
    config.set('featureFlags.viewGraphSummary', true)
    axios.post.mockResolvedValue({ data: { some: 'data' } })

    await rendertablecontroller.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('selectedYear', 2024)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', { some: 'data' })
    expect(nunjucks.render).toHaveBeenCalledWith('partials/yearlytable.njk', {
      tabledata: { some: 'data' },
      finalyear: 2024,
      viewGraphSummary: expect.objectContaining({
        href: expect.stringContaining('/stationdetails/graph-summary')
      }),
      isPartial: true
    })
    expect(h.response).toHaveBeenCalledWith('<table>content</table>')
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('handles null tabledata', async () => {
    axios.post.mockResolvedValue({ data: null })
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
  })

  it('handles empty array tabledata', async () => {
    axios.post.mockResolvedValue({ data: [] })
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
  })

  it('handles empty object tabledata', async () => {
    axios.post.mockResolvedValue({ data: {} })
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
  })

  it('handles axios error gracefully', async () => {
    axios.post.mockRejectedValue(new Error('API error'))
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
    expect(h.response).toHaveBeenCalledWith('<table>content</table>')
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('handles missing stationdetails', async () => {
    request.yar.get = jest.fn((key) => (key === 'stationdetails' ? null : 2024))
    axios.post.mockResolvedValue({ data: { some: 'data' } })
    await rendertablecontroller.handler(request, h)
    // apiparams.siteId will be null, but should not throw
    expect(request.yar.set).toHaveBeenCalledWith('selectedYear', 2024)
  })

  it('renders last-7-days partial with formatted duration when year is last-7-days', async () => {
    request.params = { year: 'last-7-days' }
    request.yar.get = jest.fn((key) => {
      if (key === 'stationdetails') {
        return {
          localSiteID: 'site123',
          siteId: 'UKA00315',
          pollutants: ['PM2.5']
        }
      }
      return undefined
    })
    axios.get.mockResolvedValue({
      data: {
        from: '2026-08-19T12:00:00.000Z',
        to: '2026-08-25T12:00:00.000Z',
        pollutants: {},
        summary: {
          daqiIndex: 2,
          pollutants: {
            PM25: {
              periodAverage: 8.2,
              dataCapture: {
                validHours: 168,
                expectedHours: 168,
                capturePercentage: 100,
                isLowDataCapture: false
              },
              dailyExceedances: null,
              hourlyExceedances: null
            }
          }
        }
      }
    })

    await rendertablecontroller.handler(request, h)

    expect(nunjucks.render).toHaveBeenCalledWith(
      'partials/last7daystable.njk',
      expect.objectContaining({
        last7Days: expect.objectContaining({
          pollutants: expect.any(Array)
        }),
        durationText: '19 August to 25 August 2026'
      })
    )
    expect(h.response).toHaveBeenCalledWith('<table>content</table>')
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('renders last-7-days partial with empty duration when stationdetails is missing', async () => {
    request.params = { year: 'last-7-days' }
    request.yar.get = jest.fn(() => null)

    await rendertablecontroller.handler(request, h)

    expect(nunjucks.render).toHaveBeenCalledWith(
      'partials/last7daystable.njk',
      {
        last7Days: {},
        durationText: ''
      }
    )
    expect(h.code).toHaveBeenCalledWith(200)
  })

  it('handles thrown error in main try/catch', async () => {
    request.yar.set = jest.fn(() => {
      throw new Error('fail')
    })

    await rendertablecontroller.handler(request, h)

    expect(h.response).toHaveBeenCalledWith('Error rendering table')
    expect(h.code).toHaveBeenCalledWith(500)
  })
})
