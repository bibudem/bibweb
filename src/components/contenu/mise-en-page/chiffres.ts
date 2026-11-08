/*
 * Animation des chiffres clés (Chiffres.astro) : quand un bloc entre à
 * l'écran, ses barres se dévoilent (CSS, classe `anime`) et ses nombres
 * montent de 0 à leur valeur, une seule fois.
 *
 * Garanties des apparitions au défilement (src/lib/animations.ts), sauf
 * une : l'état par défaut est l'état final ; rien avec le mouvement réduit,
 * sur un rechargement ou un retour (défilement restauré) ; l'impression
 * montre les valeurs finales. L'exception : un bloc déjà à l'écran au
 * chargement s'anime aussi (voir CONVENTIONS, « Chiffres clés ») ; la
 * montée des nombres est le propos du bloc, et elle ne masque aucun texte.
 *
 * Durée : deux fois --duree-longue-2. Un chiffre clé est une explication, lue
 * une fois par visite : il peut prendre plus que les 300 ms d'une
 * interface. Courbe : --courbe-emphase-deceleree, appliquée aussi aux
 * nombres par une animation Web vide dont on lit la progression.
 */

const nombre = new Intl.NumberFormat('fr-CA')
/** Décalage maximal entre unités d'un bloc (en pas de --duree-courte-1) */
const RANG_MAX = 5

function jeton(nom: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim()
}

function enMs(valeur: string) {
  const n = parseFloat(valeur)
  return valeur.endsWith('ms') ? n : n * 1000
}

/** Montre la valeur finale, ou 0 en attendant le défilement */
function afficher(compteur: HTMLElement, depart: boolean) {
  if (depart) {
    compteur.textContent = nombre.format(0)
    compteur.dataset.compte = ''
  } else {
    compteur.textContent = nombre.format(Number(compteur.dataset.compteur))
    delete compteur.dataset.compte
  }
}

/** Fait défiler un nombre de 0 à sa valeur, à la courbe donnée */
function compter(compteur: HTMLElement, duree: number, delai: number, courbe: string) {
  const fin = Number(compteur.dataset.compteur)
  const effet = new KeyframeEffect(null, null, { duration: duree, delay: delai, easing: courbe, fill: 'both' })
  const animation = new Animation(effet, document.timeline)
  animation.play()

  const terminer = () => afficher(compteur, false)
  const image = () => {
    if (animation.playState === 'finished') return terminer()
    const progression = effet.getComputedTiming().progress ?? 0
    compteur.textContent = nombre.format(Math.round(fin * progression))
    requestAnimationFrame(image)
  }
  requestAnimationFrame(image)
  return () => {
    animation.cancel()
    terminer()
  }
}

export function animerChiffres() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('print').matches) return
  if (!('IntersectionObserver' in window) || typeof KeyframeEffect === 'undefined') return
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  if (navigation && navigation.type !== 'navigate') return

  const blocs = [...document.querySelectorAll<HTMLElement>('[data-chiffres]:not(.a-animer)')]
  if (!blocs.length) return

  const duree = 2 * enMs(jeton('--duree-longue-2'))
  const pas = enMs(jeton('--duree-courte-1'))
  const courbe = jeton('--courbe-emphase-deceleree')
  const arrets = new Set<() => void>()

  for (const bloc of blocs) {
    bloc.classList.add('a-animer')
    bloc.style.setProperty('--duree-chiffres', `${duree}ms`)
    bloc.querySelectorAll<HTMLElement>('[data-chiffres-unite]').forEach((unite, i) => unite.style.setProperty('--rang', String(Math.min(i, RANG_MAX))))
    bloc.querySelectorAll<HTMLElement>('[data-compteur]').forEach((compteur) => afficher(compteur, true))
  }

  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const { target, isIntersecting } of entrees) {
        if (!isIntersecting) continue
        observateur.unobserve(target)
        const bloc = target as HTMLElement
        bloc.classList.add('anime')
        bloc.querySelectorAll<HTMLElement>('[data-chiffres-unite]').forEach((unite, i) => {
          for (const compteur of unite.querySelectorAll<HTMLElement>('[data-compteur]')) {
            const arret = compter(compteur, duree, Math.min(i, RANG_MAX) * pas, courbe)
            arrets.add(arret)
          }
        })
      }
    },
    // Le bloc est bien à l'écran : un tiers visible, ou 8 % au-dessus du bas
    { rootMargin: '0px 0px -8% 0px', threshold: 0.3 },
  )
  blocs.forEach((bloc) => observateur.observe(bloc))

  // À l'impression, les valeurs finales et les barres pleines
  window.addEventListener('beforeprint', () => {
    observateur.disconnect()
    arrets.forEach((arret) => arret())
    for (const bloc of blocs) {
      bloc.classList.remove('a-animer', 'anime')
      bloc.querySelectorAll<HTMLElement>('[data-compteur]').forEach((compteur) => afficher(compteur, false))
    }
  })
}
