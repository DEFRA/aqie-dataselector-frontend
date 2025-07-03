const IS_VISIBLE_CLASS = 'is-visible'

const ARIA_EXPANDED = 'aria-expanded'

document.addEventListener('DOMContentLoaded', () => {
  const toggletips = document.querySelectorAll('.defra-toggletip')

  toggletips.forEach((toggletip) => {
    const button = toggletip.querySelector('.defra-toggletip__button')
    const tooltip = toggletip.querySelector('.defra-toggletip__info')

    if (!button || !tooltip) {
      return
    }

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const isVisible = tooltip.classList.toggle(IS_VISIBLE_CLASS)
        button.setAttribute(ARIA_EXPANDED, isVisible)
      }
    })

    button.addEventListener('focus', () => {
      tooltip.classList.add(IS_VISIBLE_CLASS)
      button.setAttribute(ARIA_EXPANDED, 'true')
    })

    button.addEventListener('blur', () => {
      tooltip.classList.remove(IS_VISIBLE_CLASS)
      button.setAttribute(ARIA_EXPANDED, 'false')
    })
  })
})
