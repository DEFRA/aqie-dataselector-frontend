import { renderComponent } from '~/src/server/common/test-helpers/component-helpers.js'

describe('Verification banner component', () => {
  const text = 'Data has not been checked and verified'

  test('Should render the text', () => {
    const $banner = renderComponent('verification-banner', { text })

    expect(
      $banner('[data-testid="app-verification-banner"]').text().trim()
    ).toBe(text)
  })

  test('Should render the text as a paragraph inside the banner', () => {
    const $banner = renderComponent('verification-banner', { text })

    expect($banner('.app-verification-banner > p.govuk-body')).toHaveLength(1)
  })

  test('Should escape html in the text', () => {
    const $banner = renderComponent('verification-banner', {
      text: '<script>alert(1)</script>'
    })

    expect($banner('script')).toHaveLength(0)
    expect($banner('.app-verification-banner p').text()).toBe(
      '<script>alert(1)</script>'
    )
  })
})
