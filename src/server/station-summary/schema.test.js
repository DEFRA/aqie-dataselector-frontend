import { stationSummaryPayloadSchema } from './schema.js'

describe('stationSummaryPayloadSchema', () => {
  it('accepts a valid payload', () => {
    const { error, value } = stationSummaryPayloadSchema.validate({
      lat: '51.5',
      lng: '-0.1',
      name: 'Test Station'
    })

    expect(error).toBeUndefined()
    expect(value).toEqual({ lat: 51.5, lng: -0.1, name: 'Test Station' })
  })

  it('defaults name to an empty string when not provided', () => {
    const { error, value } = stationSummaryPayloadSchema.validate({
      lat: '51.5',
      lng: '-0.1'
    })

    expect(error).toBeUndefined()
    expect(value.name).toBe('')
  })

  it('rejects a missing lat', () => {
    const { error } = stationSummaryPayloadSchema.validate({ lng: '-0.1' })

    expect(error).toBeDefined()
  })

  it('rejects a missing lng', () => {
    const { error } = stationSummaryPayloadSchema.validate({ lat: '51.5' })

    expect(error).toBeDefined()
  })

  it('rejects a non-numeric lat', () => {
    const { error } = stationSummaryPayloadSchema.validate({
      lat: 'not-a-number',
      lng: '-0.1'
    })

    expect(error).toBeDefined()
  })

  it('rejects a lat out of range', () => {
    const { error } = stationSummaryPayloadSchema.validate({
      lat: '999',
      lng: '-0.1'
    })

    expect(error).toBeDefined()
  })

  it('rejects a lng out of range', () => {
    const { error } = stationSummaryPayloadSchema.validate({
      lat: '51.5',
      lng: '-999'
    })

    expect(error).toBeDefined()
  })

  it('rejects a name longer than the maximum length', () => {
    const { error } = stationSummaryPayloadSchema.validate({
      lat: '51.5',
      lng: '-0.1',
      name: 'x'.repeat(201)
    })

    expect(error).toBeDefined()
  })
})
