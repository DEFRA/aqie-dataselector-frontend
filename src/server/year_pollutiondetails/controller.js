import { english } from '~/src/server/data/en/homecontent.js'

const getpollutantsDetailsController = {
  handler: (request, h) => {
    const { home } = english

    return h.redirect('/', {
      pageTitle: home.pageTitle,
      heading: home.heading,
      text: home.texts,
      links: home.links,
      buttontxt: home.buttonText,
      subheading: home.subheading
    })
  }
}

export { getpollutantsDetailsController }
