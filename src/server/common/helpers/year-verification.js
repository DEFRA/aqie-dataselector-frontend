const NOT_VERIFIED_TEXT = 'Data has not been checked and verified'
const VERIFIED_TEXT = 'Data has been checked and verified'

/**
 * Maps the yearly table API's `dataVerifiedTag` to the verification banner.
 *
 * aqie-historicaldata-backend sends one of:
 *  - 'Data has not been verified'
 *  - 'Data has been verified until DD MMMM' (no year)
 *  - 'Data has been verified'
 *
 * Anything missing or unrecognised is treated as not verified, so the page
 * never claims data is verified when it may not be.
 * @param {string|undefined|null} dataVerifiedTag
 * @param {string|number} [year] - the selected year, appended to a partial date
 * @returns {{ status: 'unverified'|'partial'|'verified', text: string }}
 */
export function yearVerificationBanner(dataVerifiedTag, year) {
  const tag = typeof dataVerifiedTag === 'string' ? dataVerifiedTag.trim() : ''

  if (!tag || /not\s+been\s+verified/i.test(tag)) {
    return { status: 'unverified', text: NOT_VERIFIED_TEXT }
  }

  const until = /verified\s+until\s+(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/i.exec(
    tag
  )
  if (until) {
    const [, day, month, tagYear] = until
    const date = [Number(day), month, tagYear ?? year].filter(Boolean).join(' ')
    return { status: 'partial', text: `${VERIFIED_TEXT} until ${date}` }
  }

  if (/been\s+verified$/i.test(tag)) {
    return { status: 'verified', text: VERIFIED_TEXT }
  }

  return { status: 'unverified', text: NOT_VERIFIED_TEXT }
}
