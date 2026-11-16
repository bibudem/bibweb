/*
 * Infobulles CSS ([data-infobulle], global.css) : Échap ferme celle qui est
 * affichée, au survol comme au focus (WCAG 1.4.13) ; elle revient au
 * prochain survol ou focus. Une seule définition pour l'en-tête, le bouton
 * de retour en haut, l'aide de Sofia et la poignée des liens rapides.
 */

/** L'infobulle fermée de `element` revient quand on le quitte (pointeur ou focus) */
export function rouvrirInfobulle(element: HTMLElement, signal: AbortSignal) {
  for (const evenement of ['pointerleave', 'blur']) {
    element.addEventListener(evenement, () => element.removeAttribute('data-infobulle-fermee'), { signal })
  }
}

/** Ferme l'infobulle survolée ou focalisée parmi `elements` */
export function fermerInfobulle(elements: HTMLElement[]) {
  for (const element of elements) if (element.matches(':hover, :focus-visible')) element.setAttribute('data-infobulle-fermee', '')
}

/** Échap ferme l'infobulle affichée parmi `elements` */
export function infobullesFermablesAvecEchap(elements: HTMLElement[], signal: AbortSignal) {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') fermerInfobulle(elements)
    },
    { signal },
  )
  for (const element of elements) rouvrirInfobulle(element, signal)
}
