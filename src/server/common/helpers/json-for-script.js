const ESCAPES = {
  '<': String.raw`\u003c`,
  '>': String.raw`\u003e`,
  '&': String.raw`\u0026`,
  '\u2028': String.raw`\u2028`,
  '\u2029': String.raw`\u2029`
}

/**
 * Serialises a value as JSON that is safe inside a <script> element, where a
 * "</script>" or "<!--" in a string would otherwise end or change the element.
 * @param {unknown} value
 * @returns {string}
 */
function jsonForScript(value) {
  return JSON.stringify(value).replaceAll(
    /[<>&\u2028\u2029]/g,
    (char) => ESCAPES[char]
  )
}

export { jsonForScript }
