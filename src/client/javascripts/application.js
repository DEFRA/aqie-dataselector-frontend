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
  deleteGoogleAnalyticsCookies,
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

// Stale cookie cleanup: if GTM is not loaded but GA cookies exist they are
// orphaned (consent expired or was withdrawn) — delete them on page load
const gtmScript = document.querySelector(
  'script[src*="googletagmanager.com/gtm.js"]'
)
if (!gtmScript) {
  deleteGoogleAnalyticsCookies()
}

// bfcache guard: reload on back/forward cache restore so stale GTM scripts can't persist after consent withdrawal
globalThis.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    deleteGoogleAnalyticsCookies()
    globalThis.location.reload()
  }
})

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
