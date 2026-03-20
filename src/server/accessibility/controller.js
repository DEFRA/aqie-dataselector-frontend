/* eslint-disable prettier/prettier */

import { english } from '~/src/server/data/en/homecontent.js'
const accessibilityController = {
  handler: (_request, h) => {
    const {
      footer: {
        accessibility: { title, pageTitle, heading, headings, paragraphs }
      }
    } = english
    /* eslint-disable camelcase */

    const cleanPageTitle = pageTitle
      ? pageTitle.replaceAll(/['"]/, '')
      : pageTitle
    return h.view('accessibility/index', {
      pageTitle: cleanPageTitle,
      title,
      heading,
      headings,
      paragraphs
    })
  }
}

export { accessibilityController }
