class AccessibleAutoComplete {
  static ARIA_DESCRIBEDBY = 'aria-describedby'

  constructor($module, window, document) {
    this.$module = $module
    this.window = window
    this.document = document
    this.debounceTimer = null
  }

  createTrimQuery(values, delay) {
    return (query, syncResults) => {
      this.performTrimQuery(values, query, syncResults, delay)
    }
  }

  performTrimQuery(values, query, syncResults, delay) {
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      const matches = this.filterMatchingValues(values, query)
      syncResults(matches)
    }, delay)
  }

  filterMatchingValues(values, query) {
    return values.filter(
      (r) => r.toLowerCase().indexOf(query.toLowerCase().trim()) !== -1
    )
  }

  getSelectedOption(selectOptions, optionText) {
    const selectedOption = [].filter.call(
      selectOptions,
      (option) => (option.textContent || option.innerText) === optionText
    )[0]
    return selectedOption
  }

  handleConfirm(chosenOption, selectOptions, selectElement, autocompleteId) {
    selectElement.value = ''
    const chosenOptionOrCurrentValue =
      typeof chosenOption !== 'undefined'
        ? chosenOption
        : this.document.getElementById(autocompleteId)?.value
    const selectedOption = this.getSelectedOption(
      selectOptions,
      chosenOptionOrCurrentValue
    )
    if (selectedOption) {
      selectedOption.selected = true
    }
  }

  updateAriaDescribedBy(
    autocompleteElement,
    selectElementAriaDescribedBy,
    autocompleteElementAriaDescribedBy
  ) {
    autocompleteElement.setAttribute(
      AccessibleAutoComplete.ARIA_DESCRIBEDBY,
      `${selectElementAriaDescribedBy} ${autocompleteElementAriaDescribedBy}`
    )
  }

  init() {
    if (this.$module) {
      const delay = parseInt(this.$module.getAttribute('data-delay')) || 3000
      const selectElement = this.$module
      const selectOptions = Array.from(selectElement.options)
      const autocompleteId = selectElement.id
      const showAllValues =
        selectElement.getAttribute('data-show-all-values') === 'true'
      const autoselect =
        selectElement.getAttribute('data-auto-select') === 'true'
      const defaultValue = selectElement.getAttribute('data-default-value')
      const minLength = selectElement.getAttribute('data-min-length')

      const configurationOptions = {
        selectElement,
        showAllValues,
        autoselect,
        defaultValue,
        minLength,
        // we don't yet support preserveNullOptions,
        // but if we start then it needs to override this filtering
        // https://github.com/alphagov/accessible-autocomplete/blob/main/src/wrapper.js#L24
        source: this.createTrimQuery(
          Array.from(this.$module.options)
            .filter((a) => a.value)
            .map((a) => a.textContent),
          delay
        ),
        onConfirm: (chosenOption) => {
          this.handleConfirm(
            chosenOption,
            selectOptions,
            selectElement,
            autocompleteId
          )
        }
      }

      //  const language = selectElement.getAttribute('data-language') || 'en'

      this.window.HMRCAccessibleAutocomplete.enhanceSelectElement(
        configurationOptions
      )

      this.updateSelectAriaDescribedBy(selectElement, autocompleteId)
    }
  }

  updateSelectAriaDescribedBy(selectElement, autocompleteId) {
    const selectElementAriaDescribedBy =
      selectElement.getAttribute(AccessibleAutoComplete.ARIA_DESCRIBEDBY) || ''
    const autocompleteElement = this.document.getElementById(autocompleteId)
    const autocompleteElementAriaDescribedBy =
      autocompleteElement?.getAttribute(
        AccessibleAutoComplete.ARIA_DESCRIBEDBY
      ) || ''
    const autocompleteElementMissingAriaDescribedAttrs =
      autocompleteElement &&
      autocompleteElement.tagName !== 'select' &&
      !autocompleteElementAriaDescribedBy.includes(selectElementAriaDescribedBy)
    if (autocompleteElementMissingAriaDescribedAttrs) {
      // if there is a hint and/or error then the autocomplete element
      // needs to be aria-describedby these, which it isn't by default.
      // we need to check if it hasn't already been done to avoid adding
      // them twice if someone has added a separate patch.
      this.updateAriaDescribedBy(
        autocompleteElement,
        selectElementAriaDescribedBy,
        autocompleteElementAriaDescribedBy
      )
      // IMPORTANT ACCESSIBILITY NOTE:
      // on interaction, the accessible autocomplete will update the
      // aria-describedby attribute, which will cause the links to hint
      // and error to be removed. After talking with DIAS we've opted
      // not to re-add the links at the moment, because when we do they
      // are re-announced to users too much (after they select an option)
      // we may investigate ways to add the links back after a delay to
      // maintain them without reducing usability in the future.

      // and in case page is still using adam's patch, this should stop
      // the select elements aria-describedby from being added to the
      // autocomplete element twice when that runs (though unsure if a
      // screen reader would actually announce the elements twice if same
      // element was listed twice in the aria-describedby attribute)
      selectElement.setAttribute(AccessibleAutoComplete.ARIA_DESCRIBEDBY, '')
    }
  }
}

export default AccessibleAutoComplete
