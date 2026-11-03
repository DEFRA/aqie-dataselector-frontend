describe('featureFlags.viewGraphSummary', () => {
  const original = process.env.VIEW_GRAPH_SUMMARY_ENABLED

  async function loadFlag(value) {
    if (value === undefined) {
      delete process.env.VIEW_GRAPH_SUMMARY_ENABLED
    } else {
      process.env.VIEW_GRAPH_SUMMARY_ENABLED = value
    }

    jest.resetModules()
    const { config } = await import('~/src/config/config.js')
    return config.get('featureFlags.viewGraphSummary')
  }

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VIEW_GRAPH_SUMMARY_ENABLED
    } else {
      process.env.VIEW_GRAPH_SUMMARY_ENABLED = original
    }
  })

  it('is off when the environment variable is not set', async () => {
    expect(await loadFlag(undefined)).toBe(false)
  })

  it('is on when the environment variable is true', async () => {
    expect(await loadFlag('true')).toBe(true)
  })

  it('is off when the environment variable is false', async () => {
    expect(await loadFlag('false')).toBe(false)
  })
})
