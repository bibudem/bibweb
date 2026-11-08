/*
 * Cartes à révélation (CarteRevelationFond, CarteRevelationImage) : au toucher ou au
 * clic, la description prend le focus. La carte se révèle alors par
 * :focus-within, comme au clavier, et se referme quand le focus part
 * ailleurs. Sans JS, le survol et le clavier suffisent.
 */
export function activerRevelation() {
  for (const carte of document.querySelectorAll<HTMLElement>('[data-carte-revelable]')) {
    if (carte.dataset.carteRevelable === 'pret') continue
    carte.dataset.carteRevelable = 'pret'
    const description = carte.querySelector<HTMLElement>('[data-description]')
    // Au focus, Chrome ne fait pas défiler la piste d'un carrousel jusqu'à
    // une carte à demi visible (il ne défile que si l'élément est tout à fait
    // hors champ) : la description ou le bouton d'une carte coupée à droite
    // recevait le focus hors écran (WCAG 2.4.7, 2.4.11). On amène la carte
    // entière dans sa piste ; scroll-snap la cale ensuite au début d'une
    // diapositive.
    carte.addEventListener('focusin', () => {
      const piste = carte.closest<HTMLElement>('[data-piste]')
      if (!piste) return
      const r = carte.getBoundingClientRect()
      const p = piste.getBoundingClientRect()
      if (r.left < p.left - 1 || r.right > p.right + 1) carte.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    carte.addEventListener('click', (evenement) => {
      if (!description || (evenement.target as Element).closest('a, button, input, select, textarea, summary')) return
      if (!carte.contains(document.activeElement)) description.focus({ preventScroll: true })
    })
  }
}
