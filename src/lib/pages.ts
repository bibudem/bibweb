/*
 * Navigation côté client (<ClientRouter /> dans Base.astro) : la page ne se
 * recharge plus quand on suit un lien. Astro remplace le <body> et ne
 * réexécute pas les scripts du site (un module ne s'exécute qu'une fois par
 * visite). Ce qui doit être branché sur le contenu de la page passe donc par
 * aChaquePage().
 *
 * - init(signal) tourne tout de suite (premier chargement, sans attendre les
 *   images comme le ferait astro:page-load), puis après chaque changement de
 *   page.
 * - signal est annulé quand la page est quittée (astro:before-swap) :
 *   écouteurs posés sur window ou document avec { signal }, observateurs et
 *   minuteries débranchés avec auDepart(signal, …). Les écouteurs posés sur
 *   les éléments de la page partent avec eux, sans rien faire.
 */

type Init = (signal: AbortSignal) => void

/** Branche `init` sur la page courante, puis sur chaque nouvelle page */
export function aChaquePage(init: Init): void {
  let controleur = new AbortController()
  const lancer = () => {
    try {
      init(controleur.signal)
    } catch (erreur) {
      // Un composant en erreur ne bloque pas les autres
      console.error(erreur)
    }
  }
  lancer()
  let changement = false
  document.addEventListener('astro:before-swap', () => controleur.abort())
  document.addEventListener('astro:after-swap', () => {
    changement = true
  })
  // Après l'échange et les nouveaux scripts ; le premier astro:page-load
  // (événement load du premier chargement) est ignoré : init a déjà tourné
  document.addEventListener('astro:page-load', () => {
    if (!changement) return
    changement = false
    controleur = new AbortController()
    lancer()
  })
}

/** Appelle `nettoyer` quand la page est quittée */
export function auDepart(signal: AbortSignal, nettoyer: () => void): void {
  if (signal.aborted) nettoyer()
  else signal.addEventListener('abort', nettoyer, { once: true })
}
