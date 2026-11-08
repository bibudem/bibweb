/*
 * Focus donné par programme à un élément qui n'est pas interactif (contenu
 * principal, liste de résultats) : `tabindex="-1"` le temps du focus, retiré
 * quand l'élément le perd. Laissé dans le HTML, il le rend cliquable comme
 * point de focus et l'audit d'accessibilité d'Astro le signale.
 */
export function focaliserTemporairement(element: HTMLElement, options?: FocusOptions) {
  element.setAttribute('tabindex', '-1')
  element.focus(options)
  element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
}
