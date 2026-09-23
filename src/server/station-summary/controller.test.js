import { stationSummaryController } from './controller.js'
import { fetchStationByLocation } from '~/src/server/common/helpers/station-helpers.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'

jest.mock('~/src/server/common/helpers/station-helpers.js')
jest.mock('~/src/server/common/helpers/navigation-helpers.js')

describe('stationSummaryController.handler', () => {
  let h, request

  beforeEach(() => {
    jest.clearAllMocks()
    h = {
      redirect: jest.fn().mockReturnThis()
    }
    renderNotFound.mockReturnValue('not-found-response')
    request = {
      query: { lat: '51.5', lng: '-0.1', name: 'Test Station' },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
  })

  it('renders not found when lat is missing', async () => {
    request.query = { lng: '-0.1' }

    const result = await stationSummaryController.handler(request, h)

    expect(fetchStationByLocation).not.toHaveBeenCalled()
    expect(renderNotFound).toHaveBeenCalledWith(h)
    expect(result).toBe('not-found-response')
  })

  it('renders not found when lng is missing', async () => {
    request.query = { lat: '51.5' }

    const result = await stationSummaryController.handler(request, h)

    expect(fetchStationByLocation).not.toHaveBeenCalled()
    expect(result).toBe('not-found-response')
  })

  it('renders not found when no station matches', async () => {
    fetchStationByLocation.mockResolvedValue(null)

    const result = await stationSummaryController.handler(request, h)

    expect(fetchStationByLocation).toHaveBeenCalledWith({
      lat: '51.5',
      lng: '-0.1',
      name: 'Test Station'
    })
    expect(request.yar.set).not.toHaveBeenCalled()
    expect(result).toBe('not-found-response')
  })

  it('seeds the session and redirects to /stationdetails when a station is found', async () => {
    const station = { id: 'TestStation', name: 'Test Station' }
    fetchStationByLocation.mockResolvedValue(station)
    request.yar.get.mockReturnValue(undefined)

    const result = await stationSummaryController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('MonitoringstResult', {
      message: 'success',
      getmonitoringstation: [station]
    })
    expect(request.yar.set).toHaveBeenCalledWith('SiteId', 'TestStation')
    expect(request.yar.set).toHaveBeenCalledWith('nooflocation', 'single')
    expect(request.yar.set).toHaveBeenCalledWith('deepLinkTrusted', true)
    expect(request.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      expect.any(String)
    )
    expect(h.redirect).toHaveBeenCalledWith('/stationdetails')
    expect(result).toBe(h)
  })

  it('does not overwrite an existing selectedYear', async () => {
    const station = { id: 'TestStation', name: 'Test Station' }
    fetchStationByLocation.mockResolvedValue(station)
    request.yar.get.mockImplementation((key) =>
      key === 'selectedYear' ? '2023' : undefined
    )

    await stationSummaryController.handler(request, h)

    expect(request.yar.set).not.toHaveBeenCalledWith(
      'selectedYear',
      expect.anything()
    )
  })
})
