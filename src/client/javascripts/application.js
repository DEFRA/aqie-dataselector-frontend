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
document.addEventListener('DOMContentLoaded', () => {
  accessibleAutocomplete({
    element: document.querySelector('#autocomplete-container-p'),
    id: 'my-autocomplete',
    source: [
      // Pollutants
      'Fine particulate matter (PM2.5)',
      'Particulate matter (PM10)',
      'Nitrogen dioxide (NO2)',
      'Ozone (O3)',
      'Sulphur dioxide (SO2)',
      'Nitric oxide (NO)',
      'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
      'Carbon monoxide (CO)',
      'Sulphur dioxide (SO2)'
    ]
  })
})

// initAll()
