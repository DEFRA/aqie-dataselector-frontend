async function loadPolicy(mapsUrl) {
  let policy
  await jest.isolateModulesAsync(async () => {
    const { config } = await import('~/src/config/config.js')
    config.set('mapsFrontEnd.url', mapsUrl)
    ;({ contentSecurityPolicy: policy } = await import(
      '~/src/server/common/helpers/content-security-policy.js'
    ))
  })
  return policy
}

describe('contentSecurityPolicy formAction', () => {
  it('allows posting to the maps front end for the nearby stations link', async () => {
    const policy = await loadPolicy('https://maps.example/')

    expect(policy.options.formAction).toEqual(['self', 'https://maps.example'])
  })

  it('only allows self when no maps front end URL is configured', async () => {
    const policy = await loadPolicy(null)

    expect(policy.options.formAction).toEqual(['self'])
  })
})
