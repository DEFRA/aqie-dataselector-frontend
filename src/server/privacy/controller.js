/* eslint-disable prettier/prettier */

import { english } from '~/src/server/data/en/homecontent.js'
const privacyController = {
  handler: (request, h) => {
    const {
      footer: {
        privacy: { title, pageTitle, heading, headings, paragraphs }
      }
    } = english
    /* eslint-disable camelcase */
    // const {
    //   query: { lang }
    // } = request
    // if (lang && lang === 'cy') {
    //   return h.redirect(`/preifatrwydd/cy?lang=cy`)
    // }
    return h.view('privacy/index', {
      pageTitle,
      title,
      heading,
      headings,
      paragraphs
    })
  }
}

export { privacyController }
