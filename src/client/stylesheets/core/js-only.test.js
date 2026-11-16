/**
 * @jest-environment jsdom
 */

import path from 'node:path'
import { TextDecoder, TextEncoder } from 'node:util'

describe('.aq-js-only', () => {
  const displayOfJsOnlyContent = () =>
    globalThis.getComputedStyle(document.querySelector('.aq-js-only')).display

  let css

  beforeAll(async () => {
    // sass-embedded needs these, which jest-environment-jsdom does not expose
    Object.assign(globalThis, { TextDecoder, TextEncoder })
    const sass = await import('sass-embedded')
    ;({ css } = sass.compile(
      path.resolve('src/client/stylesheets/core/_js-only.scss')
    ))
  })

  beforeEach(() => {
    document.head.innerHTML = `<style>${css}</style>`
    document.body.className = ''
    document.body.innerHTML = '<div class="aq-js-only">JavaScript only</div>'
  })

  it('is hidden when JavaScript is not enabled', () => {
    expect(displayOfJsOnlyContent()).toBe('none')
  })

  it('is shown once the GOV.UK template has marked JavaScript as enabled', () => {
    document.body.classList.add('js-enabled')

    expect(displayOfJsOnlyContent()).toBe('block')
  })
})
