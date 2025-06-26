import { privacyController } from '~/src/server/privacy/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('privacyController', () => {
  let request, h

  beforeEach(() => {
    request = {} // No specific request data needed for this controller
    h = {
      view: jest.fn()
    }
  })

  it('should render the privacy page with correct content', () => {
    const {
      footer: {
        privacy: { title, pageTitle, heading, headings, paragraphs }
      }
    } = english

    const result = privacyController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('privacy/index', {
      pageTitle,
      title,
      heading,
      headings,
      paragraphs
    })

    expect(result).toBe(
      h.view('privacy/index', {
        pageTitle,
        title,
        heading,
        headings,
        paragraphs
      })
    )
  })
})
