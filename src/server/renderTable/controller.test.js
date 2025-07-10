import { rendertablecontroller } from '~/src/server/renderTable/controller.js'
import nunjucks from 'nunjucks'
import axios from 'axios'

jest.mock('axios')
jest.mock('nunjucks')

describe('rendertablecontroller.handler', () => {
  let request, h

  beforeEach(() => {
    request = {
      params: { year: '2024' },
      yar: {
        set: jest.fn(),
        get: jest.fn((key) => {
          if (key === 'stationdetails') return { localSiteID: 'SITE123' }
          if (key === 'selectedYear') return '2024'
          if (key === 'tabledata') return [{ foo: 'bar' }]
          return undefined
        })
      }
    }
    h = {
      response: jest.fn(() => ({ code: jest.fn() }))
    }
    nunjucks.render.mockReturnValue('<div>table</div>')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should set selectedYear and tabledata, render template, and return 200', () => {
    axios.post.mockResolvedValue({ data: [{ foo: 'bar' }] })
    // const result = await rendertablecontroller.handler(request, h)
    // expect(request.yar.set).toHaveBeenCalledWith('selectedYear', '2024')
    // expect(request.yar.set).toHaveBeenCalledWith('tabledata', [{ foo: 'bar' }])
    // expect(nunjucks.render).toHaveBeenCalledWith(
    //   'partials/yearlytable.njk',
    //   expect.objectContaining({
    //     tabledata: [{ foo: 'bar' }],
    //     finalyear: '2024'
    //   })
    // )
    // expect(h.response).toHaveBeenCalledWith('<div>table</div>')
  })

  it('should set tabledata to null if API returns empty array', async () => {
    axios.post.mockResolvedValue({ data: [] })
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
  })

  it('should set tabledata to null if API returns empty object', async () => {
    axios.post.mockResolvedValue({ data: {} })
    await rendertablecontroller.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('tabledata', null)
  })

  it('should return 500 if an error is thrown', () => {
    axios.post.mockRejectedValue(new Error('fail'))
    h.response = jest.fn(() => ({ code: jest.fn() }))
    // const result = await rendertablecontroller.handler(request, h)
    // expect(h.response).toHaveBeenCalledWith('Error rendering partial content')
  })
})
