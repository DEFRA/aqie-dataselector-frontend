import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'
// import CookieBanner from './cookie-banner.js'
import {
  getConsentCookie,
  isValidConsentCookie,
  removeUACookies
} from './cookie-functions.js'
// import CookiesPage from './cookies-page.js'
// import 'src/client/javascripts/toggletip.js'
createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)
const $cookieBanner = document.querySelector(
  '[data-module="govuk-cookie-banner"]'
)

if ($cookieBanner) {
  // const ck = new CookieBanner($cookieBanner)
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
  // new CookiesPage($cookiesPage)
}

// function compareNames(a, b) {
//   if (a.text < b.text) {
//     return -1
//   }
//   if (a.text > b.text) {
//     return 1
//   }
//   return 0
// }
