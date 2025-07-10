/* eslint-disable prettier/prettier */

import { english } from '~/src/server/data/en/homecontent.js'
const cookiesController = {
  handler: (request, h) => {
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

    return h.view('cookies/index', {
      pageTitle,
      title,
      headings,
      heading,
      table1,
      table2,
      paragraphs
    })
  }
}

export { cookiesController }
