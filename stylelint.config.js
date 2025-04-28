/**
 * @type {Config}
 */
export default {
  extends: ['stylelint-config-gds/scss'],
  ignoreFiles: ['**/public/**', '**/package/**', '**/vendor/**'],
  rules: {
    'scss/double-slash-comment-whitespace-inside': 'always',
    'length-zero-no-unit': null,
    'rule-empty-line-before': null,
    'declaration-block-no-duplicate-properties': null,
    'color-named': null,
    'declaration-no-important': null,
    'shorthand-property-no-redundant-values': null
    // 'selector-no-qualifying-type': null,
    // 'max-nesting-depth': [
    //   3,
    //   { ignore: ['blockless-at-rules', 'pseudo-classes'] }
    // ],
    // 'selector-max-id': null
  }
}

/**
 * @import { Config } from 'stylelint'
 */
