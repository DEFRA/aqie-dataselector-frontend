import { cookiesController } from '~/src/server/cookies/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('cookiesController', () => {
  it('should render the cookies/index view with correct data', () => {
    // Mock request and h toolkit
    const request = {} // No query param used in current logic

    const viewMock = jest.fn()
    const h = {
      view: viewMock
    }

    // Call the handler
    cookiesController.handler(request, h)

    // Extract expected data from english content
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

    // Assert the view was called with correct template and data
    expect(viewMock).toHaveBeenCalledWith('cookies/index', {
      pageTitle,
      title,
      headings,
      heading,
      table1,
      table2,
      paragraphs
    })
  })
})
