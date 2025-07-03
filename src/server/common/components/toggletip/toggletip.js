document.addEventListener('DOMContentLoaded', () => {
  const toggletips = document.querySelectorAll('.defra-toggletip')

  toggletips.forEach((toggletip) => {
    const button = toggletip.querySelector('.defra-toggletip__button')
    const tooltip = toggletip.querySelector('.defra-toggletip__info')

    if (!button || !tooltip) return

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const isVisible = tooltip.classList.toggle('is-visible')
        button.setAttribute('aria-expanded', isVisible)
      }
    })

    button.addEventListener('focus', () => {
      tooltip.classList.add('is-visible')
      button.setAttribute('aria-expanded', 'true')
    })

    button.addEventListener('blur', () => {
      tooltip.classList.remove('is-visible')
      button.setAttribute('aria-expanded', 'false')
    })
  })
})
