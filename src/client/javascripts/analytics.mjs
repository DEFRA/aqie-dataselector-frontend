// @ts-nocheck
export default function loadAnalytics() {
  if (!window.ga || !window.ga.loaded) {
    // Load gtm script
    // Script based on snippet at https://developers.google.com/tag-manager/quickstart
    // prettier-ignore
    ;(function (w, d, s, l, i) {
      w[l] = w[l] || []
      w[l].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      })
     
      const noscript = document.createElement('noscript')
      const iframe = document.createElement('iframe')
      // iframe.setAttribute("height", "0")
      // iframe.setAttribute("width", "0")
      // iframe.setAttribute("style", "display:none;visibility:hidden")
      // iframe.async = true
      // iframe.src = "https://www.googletagmanager.com/ns.html?id=G-8CMZBTDQBC"
      // noscript.appendChild(iframe)
      // document.body.appendChild(noscript)
     
      const j = d.createElement(s)
      const dl = l !== 'dataLayer' ? `&l=${l}` : ''
      window.dataLayer = window.dataLayer || []
      function gtag() {
        window.dataLayer.push(arguments)
      }
      // gtag('js', new Date())
      // gtag('config', 'G-8CMZBTDQBC')
      // j.async = true
      // j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`
      // document.head.appendChild(j)
    })(window, document, 'script', 'dataLayer', 'G-8CMZBTDQBC')
  }
}
