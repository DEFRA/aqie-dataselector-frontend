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
import {
  getConsentCookie,
  isValidConsentCookie,
  removeUACookies
} from './cookie-functions.js'
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

// Initialise analytics if consent is given
const userConsent = getConsentCookie()
if (userConsent && isValidConsentCookie(userConsent) && userConsent.analytics) {
  // Analytics()

  // Remove UA cookies if the user previously had them set or Google attempts
  // to set them
  removeUACookies()
}

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
