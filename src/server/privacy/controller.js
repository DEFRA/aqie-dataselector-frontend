/* eslint-disable prettier/prettier */

import { english } from '~/src/server/data/en/homecontent.js'
const privacyController = {
  handler: (request, h) => {
    const {
      footer: {
        privacy: { title, pageTitle, heading, headings, paragraphs }
      }
    } = english

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
