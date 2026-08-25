import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'
import CookieBanner from './cookie-banner.js'
import accessibleAutocomplete from 'accessible-autocomplete'
import AccessibleAutoComplete from './accessible-autocomplete.js'
import { resetCookies } from './cookie-functions.js'
import CookiesPage from './cookies-page.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

// Initialize all accessible autocomplete components
const $accessibleAutocompletes = document.querySelectorAll(
  '[data-module="accessible-autocomplete"]'
)
$accessibleAutocompletes.forEach(($autocomplete) => {
  new AccessibleAutoComplete($autocomplete, globalThis, document).init()
})

// Initialise cookie banner
const $cookieBanner = document.querySelector(
  '[data-module="govuk-cookie-banner"]'
)
if ($cookieBanner) {
  // Instantiating for side effects (e.g., auto-initialization)
  new CookieBanner($cookieBanner)
}

// Initialise analytics state based on saved consent cookie
resetCookies()

// Initialise cookie page
const $cookiesPage = document.querySelector('[data-module="app-cookies-page"]')
if ($cookiesPage) {
  // Instantiating for side effects (e.g., auto-initialization)
  new CookiesPage($cookiesPage)
}

// Make accessibleAutocomplete available globally for use in page-specific scripts
globalThis.accessibleAutocomplete = accessibleAutocomplete
globalThis.AccessibleAutoComplete = AccessibleAutoComplete

// initAll()
