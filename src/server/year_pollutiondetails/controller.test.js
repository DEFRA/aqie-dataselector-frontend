import { getpollutantsDetailsController } from '~/src/server/year_pollutiondetails/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('getpollutantsDetailsController', () => {
  let request, h

  beforeEach(() => {
    request = {}
    h = {
      redirect: jest.fn()
    }
  })

  it('should redirect to home with correct data', () => {
    const { home } = english

    getpollutantsDetailsController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/', {
      pageTitle: home.pageTitle,
      heading: home.heading,
      text: home.texts,
      links: home.links,
      buttontxt: home.buttonText,
      subheading: home.subheading
    })
  })
})
