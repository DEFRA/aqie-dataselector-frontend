/* eslint-disable prettier/prettier */

import { accessibilityContent } from '~/src/server/data/en/accessibilitycontent.js'
const accessibilityController = {
  handler: (_request, h) => {
    const title = 'Accessibility statement'
    const pageTitle = `${title} - Get air pollution data`

    return h.view('accessibility/index', {
      pageTitle,
      title,
      texts: accessibilityContent.texts
    })
  }
}

export { accessibilityController }
