import { yearVerificationBanner } from '~/src/server/common/helpers/year-verification.js'

describe('yearVerificationBanner', () => {
  test('a fully verified year shows the green banner', () => {
    expect(yearVerificationBanner('Data has been verified', 2024)).toEqual({
      status: 'verified',
      text: 'Data has been checked and verified'
    })
  })

  test('a partly verified year shows the yellow banner with the date and selected year', () => {
    expect(
      yearVerificationBanner('Data has been verified until 30 September', 2025)
    ).toEqual({
      status: 'partial',
      text: 'Data has been checked and verified until 30 September 2025'
    })
  })

  test('drops the leading zero from the day', () => {
    expect(
      yearVerificationBanner('Data has been verified until 01 March', '2025')
        .text
    ).toBe('Data has been checked and verified until 1 March 2025')
  })

  test('keeps a year already in the tag rather than adding the selected one', () => {
    expect(
      yearVerificationBanner('Data has been verified until 31 March 2025', 2026)
        .text
    ).toBe('Data has been checked and verified until 31 March 2025')
  })

  test.each([
    'Data has not been verified',
    undefined,
    null,
    '',
    'something unexpected'
  ])('%p shows the red not verified banner', (tag) => {
    expect(yearVerificationBanner(tag, 2026)).toEqual({
      status: 'unverified',
      text: 'Data has not been checked and verified'
    })
  })
})
