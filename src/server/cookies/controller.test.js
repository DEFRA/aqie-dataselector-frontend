import {
  cookiesController,
  cookiesPostController
} from '~/src/server/cookies/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('cookiesController', () => {
  it('should render the cookies/index view with correct data', () => {
    const request = { state: {} }
    const viewMock = jest.fn()
    const h = { view: viewMock }

    cookiesController.handler(request, h)

    const {
      footer: {
        cookies: {
          pageTitle,
          title,
          headings,
          heading,
          table1,
          table2,
          paragraphs
        }
      }
    } = english

    expect(viewMock).toHaveBeenCalledWith('cookies/index', {
      pageTitle,
      title,
      headings,
      heading,
      table1,
      table2,
      paragraphs,
      analyticsConsented: false
    })
  })
})

describe('cookiesPostController', () => {
  let h

  beforeEach(() => {
    h = {
      state: jest.fn(),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  it('sets the consent cookie with analytics: true when analytics is "true"', () => {
    const request = { payload: { analytics: 'true', returnUrl: '/some/page' } }
    cookiesPostController.handler(request, h)
    expect(h.state).toHaveBeenCalledWith(
      'cookies_policy',
      JSON.stringify({ analytics: true, version: 1 })
    )
  })

  it('sets the consent cookie with analytics: false when analytics is "false"', () => {
    const request = { payload: { analytics: 'false', returnUrl: '/' } }
    cookiesPostController.handler(request, h)
    expect(h.state).toHaveBeenCalledWith(
      'cookies_policy',
      JSON.stringify({ analytics: false, version: 1 })
    )
  })

  it('redirects to returnUrl when it is a safe relative path', () => {
    const request = {
      payload: { analytics: 'true', returnUrl: '/data-selector' }
    }
    const result = cookiesPostController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/data-selector')
    expect(result).toBe('redirect-response')
  })

  it('redirects to /cookies?updated=true when returnUrl is absent', () => {
    const request = { payload: { analytics: 'false' } }
    cookiesPostController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/cookies?updated=true')
  })

  it('redirects to /cookies?updated=true when returnUrl is an absolute URL', () => {
    const request = {
      payload: { analytics: 'true', returnUrl: 'https://evil.com' }
    }
    cookiesPostController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/cookies?updated=true')
  })

  it('redirects to /cookies?updated=true when returnUrl is protocol-relative', () => {
    const request = { payload: { analytics: 'true', returnUrl: '//evil.com' } }
    cookiesPostController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/cookies?updated=true')
  })

  it('handles a missing payload without throwing', () => {
    const request = { payload: null }
    expect(() => cookiesPostController.handler(request, h)).not.toThrow()
  })
})
