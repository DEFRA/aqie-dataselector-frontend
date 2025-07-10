// @ts-nocheck
export default function loadAnalytics() {
  if (!window.ga || !window.ga.loaded) {
    
    ;(function (w, d, s, l, i) {
      w[l] = w[l] || []
      w[l].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      })
     
      const noscript = document.createElement('noscript')
      const iframe = document.createElement('iframe')
     
     
      const j = d.createElement(s)
      const dl = l !== 'dataLayer' ? `&l=${l}` : ''
      window.dataLayer = window.dataLayer || []
      function gtag() {
        window.dataLayer.push(arguments)
      }
      
    })(window, document, 'script', 'dataLayer', 'G-V4MBMR0QPC')
  }
}
