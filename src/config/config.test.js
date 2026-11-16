describe('featureFlags.viewGraphSummary', () => {
  const originalValue = process.env.VIEW_GRAPH_SUMMARY_ENABLED

  // config.js reads process.env when it is first evaluated, so load it fresh
  async function loadFlag() {
    const { config } = await import('~/src/config/config.js')
    return config.get('featureFlags.viewGraphSummary')
  }

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.VIEW_GRAPH_SUMMARY_ENABLED
    } else {
      process.env.VIEW_GRAPH_SUMMARY_ENABLED = originalValue
    }
  })

  it('is disabled when VIEW_GRAPH_SUMMARY_ENABLED is not set', async () => {
    delete process.env.VIEW_GRAPH_SUMMARY_ENABLED

    expect(await loadFlag()).toBe(false)
  })

  it('is enabled when VIEW_GRAPH_SUMMARY_ENABLED is true', async () => {
    process.env.VIEW_GRAPH_SUMMARY_ENABLED = 'true'

    expect(await loadFlag()).toBe(true)
  })

  it('is disabled when VIEW_GRAPH_SUMMARY_ENABLED is false', async () => {
    process.env.VIEW_GRAPH_SUMMARY_ENABLED = 'false'

    expect(await loadFlag()).toBe(false)
  })
})
