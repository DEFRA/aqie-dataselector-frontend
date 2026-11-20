import { jsonForScript } from '~/src/server/common/helpers/json-for-script.js'

describe('jsonForScript', () => {
  it('serialises a value as JSON', () => {
    const value = { a: 1, b: [null, 'x'] }

    expect(JSON.parse(jsonForScript(value))).toEqual(value)
  })

  it('cannot end the script element or open a comment from inside a string', () => {
    const json = jsonForScript({ name: '</script><!-- & more' })

    expect(json).not.toContain('<')
    expect(json).not.toContain('>')
    expect(json).not.toContain('&')
    expect(JSON.parse(json)).toEqual({ name: '</script><!-- & more' })
  })

  it('escapes the line separators that end a line in a script', () => {
    const json = jsonForScript('a\u2028b\u2029c')

    expect(json).not.toMatch(/[\u2028\u2029]/)
    expect(JSON.parse(json)).toBe('a\u2028b\u2029c')
  })
})
