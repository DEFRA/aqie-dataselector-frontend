export default function loadAnalytics() {
  if (!window.ga?.loaded) {
    window.dataLayer = window.dataLayer || []
    if (localStorage.getItem('consentMode') === null) {
      window.dataLayer.push('consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        personalization_storage: 'denied',
        functionality_storage: 'denied',
        security_storage: 'denied'
      })
    } else {
      window.dataLayer.push(
        'consent',
        'default',
        JSON.parse(localStorage.getItem('consentMode'))
      )
    }
    // prettier-ignore
    ;(function (w, d, s, l,i) {
        w[l] = w[l] || []
        w[l].push({
          'gtm.start': new Date().getTime(),
          event: 'gtm.js'
        })
       
        const noscript = document.createElement('noscript')
        const iframe = document.createElement('iframe')
        iframe.setAttribute("height", "0")
        iframe.setAttribute("width", "0")
        iframe.setAttribute("style", "display:none;visibility:hidden")
        iframe.async = true
        iframe.src = "https://www.googletagmanager.com/ns.html?id=GTM-5ZWS27T3%22"
        noscript.appendChild(iframe)
        document.body.appendChild(noscript)
       
        const k = d.createElement(s)
        k.async = true
        k.src = "https://www.googletagmanager.com/ns.html?id=GTM-5ZWS27T3%22"
        document.body.appendChild(k)
      
        const f = d.getElementsByTagName(s)[0];
        const j = d.createElement(s); 
     
        j.async = true;
       
        j.src = `https://www.googletagmanager.com/gtag/js?id=${i}` 
        f.parentNode.insertBefore(j, f)
        window.dataLayer.push('js', new Date())
       
        
      })(window, document, 'script', 'dataLayer', 'GTM-5ZWS27T3')
  }
}

