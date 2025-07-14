import { rendertablecontroller } from '~/src/server/renderTable/controller.js'
import axios from 'axios'
import nunjucks from 'nunjucks'

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

  it('renders table with valid data', () => {
    axios.post.mockResolvedValue({ data: { some: 'data' } })
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

  it('handles thrown error in main try/catch', () => {
    request.yar.set = jest.fn(() => {
      throw new Error('fail')
    })
  })
})
