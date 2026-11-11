/*
 * Comportement du menu du site, côté navigateur : un seul module pour le
 * DOM qu'Entete.astro (boutons Menu et loupe, voile) et PanneauMenu.astro
 * (rideau, feuille, « Afficher le menu », poignée) rendent ensemble.
 * Importé une fois, par le script d'Entete.astro, qui le rebranche à
 * chaque page.
 *
 * - Les deux boutons Menu (barre compacte et barre de bureau) et les deux
 *   loupes commandent le même rideau (#menu-principal), selon le motif
 *   « disclosure navigation » de l'APG : aria-expanded et aria-label suivent
 *   l'état ; Échap ferme et rend le focus au bouton qui a ouvert.
 * - Deux modes, posés sur le rideau (data-mode) : « complet » (bouton Menu)
 *   et « recherche » (loupe : la recherche seule, le focus dans le champ).
 *   « Afficher le menu » déplie le reste ; la loupe, menu entier ouvert, le
 *   replie. Le passage d'un mode à l'autre est animé.
 * - La poignée du bas de la feuille (sous 1200 px) ferme d'un tapotement, ou
 *   d'un glissé vers le haut : la feuille suit le doigt.
 * - Le rideau se referme quand le focus le quitte, ou au clic sur le voile.
 */

type Mode = 'recherche' | 'complet'

/**
 * Branche le menu de l'en-tête. `surChangement` est rappelée à chaque
 * ouverture et fermeture (apparence de la barre de bureau, qui dépend de
 * data-menu-ouvert). `signal` débranche l'écouteur posé sur le document au
 * changement de page (lib/pages.ts).
 */
export function brancherMenu(entete: HTMLElement, surChangement: () => void, signal: AbortSignal) {
  const boutons = [...entete.querySelectorAll<HTMLButtonElement>('[data-bouton-menu]')]
  const loupes = [...entete.querySelectorAll<HTMLButtonElement>('[data-bouton-recherche]')]
  const panneau = document.getElementById('menu-principal')
  // Bouton qui a ouvert le rideau (il reprend le focus à la fermeture)
  let ouvert: HTMLButtonElement | null = null
  let mode: Mode = 'complet'

  // État des boutons : la loupe est « ouverte » en mode recherche, le
  // bouton Menu en mode complet ; chacun montre alors un X
  function majBoutons() {
    for (const b of boutons) {
      const actif = !!ouvert && mode === 'complet'
      b.setAttribute('aria-expanded', String(actif))
      // Le nom suit le libellé visible « Fermer » de la barre de bureau (WCAG 2.5.3)
      b.setAttribute('aria-label', actif ? 'Fermer le menu' : 'Menu')
    }
    for (const l of loupes) {
      const actif = !!ouvert && mode === 'recherche'
      l.setAttribute('aria-expanded', String(actif))
      l.setAttribute('aria-label', actif ? 'Fermer la recherche' : 'Rechercher')
    }
  }

  function fermer({ rendreFocus = false } = {}) {
    if (!ouvert) return
    const bouton = ouvert
    panneau?.setAttribute('hidden', '')
    entete.removeAttribute('data-menu-ouvert')
    ouvert = null
    majBoutons()
    surChangement()
    if (rendreFocus) bouton.focus()
  }

  function changerMode(nouveau: Mode) {
    mode = nouveau
    if (panneau) panneau.dataset.mode = nouveau
    // La poignée du bas (mobile) ferme ce qui est ouvert
    panneau?.querySelector('[data-poignee-menu]')?.setAttribute('aria-label', nouveau === 'recherche' ? 'Fermer la recherche' : 'Fermer le menu')
    majBoutons()
  }

  function ouvrir(bouton: HTMLButtonElement, nouveau: Mode) {
    fermer()
    // Le rideau remplit la fenêtre sous l'en-tête, où qu'il soit (bandeau
    // d'urgence au-dessus, page défilée ou non)
    panneau?.style.setProperty('--haut-menu', `${Math.max(0, entete.getBoundingClientRect().bottom)}px`)
    ouvert = bouton
    changerMode(nouveau)
    panneau?.removeAttribute('hidden')
    entete.setAttribute('data-menu-ouvert', '')
    surChangement()
    if (nouveau === 'recherche') panneau?.querySelector<HTMLInputElement>('input[type=search]')?.focus({ preventScroll: true })
  }

  // Passage d'un mode à l'autre, animé. Repli (loupe, menu entier
  // ouvert) : le reste du menu s'efface en remontant, puis la feuille se
  // rétracte jusqu'à la recherche. Dépliage (Menu ou « Afficher le
  // menu ») : la feuille s'allonge et le reste du menu apparaît en
  // descendant, en léger décalage. La poignée, collée au bas de la
  // feuille, suit. Sans animation si le mouvement réduit est demandé.
  const COURBE_ENTREE = 'cubic-bezier(0.05, 0.7, 0.1, 1)'
  const COURBE_SORTIE = 'cubic-bezier(0.3, 0, 1, 1)'
  let animation = false
  const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const feuille = () => panneau?.querySelector<HTMLElement>('.feuille')
  const autresGroupes = () => [...(feuille()?.querySelectorAll<HTMLElement>('.grille > :not(.sofia, .deplier)') ?? [])].filter((e) => e.offsetParent)

  // Hauteur de la feuille animée de sa valeur actuelle à celle du mode
  // suivant
  async function changerHauteur(f: HTMLElement, avant: number) {
    f.style.height = ''
    const apres = f.getBoundingClientRect().height
    // Pas de barre de défilement le temps de l'agrandissement
    f.style.overflowY = 'hidden'
    await f.animate([{ height: `${avant}px` }, { height: `${apres}px` }], { duration: 300, easing: COURBE_ENTREE }).finished.catch(() => {})
    f.style.overflowY = ''
  }

  async function replier() {
    const f = feuille()
    const champ = panneau?.querySelector<HTMLInputElement>('input[type=search]')
    if (!f || reduit() || animation) {
      changerMode('recherche')
      f?.scrollTo({ top: 0 })
      champ?.focus({ preventScroll: true })
      return
    }
    animation = true
    const autres = autresGroupes()
    const avant = f.getBoundingClientRect().height
    f.style.height = `${avant}px`
    f.scrollTo({ top: 0, behavior: 'smooth' })
    await Promise.all(
      autres.map((e) => e.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -1rem' }], { duration: 150, easing: COURBE_SORTIE, fill: 'forwards' }).finished),
    )
    changerMode('recherche')
    for (const e of autres) e.getAnimations().forEach((a) => a.cancel())
    champ?.focus({ preventScroll: true })
    await changerHauteur(f, avant)
    animation = false
  }

  async function deplier(bouton: HTMLButtonElement) {
    ouvert = bouton
    const f = feuille()
    if (!f || reduit() || animation) {
      changerMode('complet')
      return
    }
    animation = true
    const avant = f.getBoundingClientRect().height
    f.style.height = `${avant}px`
    changerMode('complet')
    const autres = autresGroupes()
    autres.forEach((e, i) =>
      e.animate([{ opacity: 0, translate: '0 -1rem' }, { opacity: 1, translate: '0 0' }], { duration: 300, delay: 60 + i * 50, easing: COURBE_ENTREE, fill: 'backwards' }),
    )
    await changerHauteur(f, avant)
    animation = false
  }

  for (const bouton of boutons) {
    bouton.addEventListener('click', () => {
      if (ouvert && mode === 'complet') fermer()
      // Ouvert en mode recherche : le menu se déplie sans se refermer
      else if (ouvert) deplier(bouton)
      else ouvrir(bouton, 'complet')
    })
  }
  for (const loupe of loupes) {
    loupe.addEventListener('click', () => {
      if (ouvert && mode === 'recherche') fermer()
      // Menu entier ouvert : il se replie sur la recherche seule, et la
      // loupe prend le X
      else if (ouvert) {
        ouvert = loupe
        replier()
      } else ouvrir(loupe, 'recherche')
    })
  }

  // « Afficher le menu », sous la recherche : le menu se déplie ; le focus
  // passe au premier lien apparu, le bouton disparaissant
  for (const bouton of panneau?.querySelectorAll<HTMLButtonElement>('[data-deplier-menu]') ?? []) {
    bouton.addEventListener('click', () => {
      if (ouvert) deplier(boutons.find((b) => b.offsetParent) ?? ouvert)
      const grille = bouton.closest('.grille')
      requestAnimationFrame(() => {
        const premier = [...(grille?.querySelectorAll<HTMLElement>('a[href], button, summary') ?? [])].find((e) => !e.closest('.sofia, .deplier') && e.offsetParent)
        premier?.focus({ preventScroll: true })
      })
    })
  }

  entete.querySelector('[data-voile-menu]')?.addEventListener('click', () => fermer())

  for (const poignee of panneau?.querySelectorAll<HTMLButtonElement>('[data-poignee-menu]') ?? []) brancherPoignee(poignee, () => fermer({ rendreFocus: true }))

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !ouvert) return
    // Une boîte de dialogue ouverte par-dessus (recherche) gère sa propre Échap
    if (document.querySelector('dialog[open]')) return
    fermer({ rendreFocus: true })
  }, { signal })

  // Le panneau se referme quand le focus quitte le menu (tabulation après
  // le dernier lien) : sinon il resterait ouvert par-dessus la page.
  entete.addEventListener('focusout', (e) => {
    if (!ouvert) return
    const suivant = e.relatedTarget as Node | null
    if (!suivant) return
    // Les boutons Menu et loupe restent dans le parcours (on passe de l'un à l'autre)
    if ([...boutons, ...loupes].some((b) => b.contains(suivant)) || panneau?.contains(suivant)) return
    fermer()
  })
}

// Poignée : un tapotement ferme ; un glissé vers le haut entraîne la feuille
const SEUIL_DEPART = 8 // px avant de considérer le geste comme un glissé
const VITESSE_FERMETURE = 0.5 // px/ms : un geste vif ferme même s'il est court

function brancherPoignee(poignee: HTMLButtonElement, fermer: () => void) {
  const feuille = poignee.closest<HTMLElement>('.feuille')
  if (!feuille) return
  let depart: { y: number; t: number } | null = null
  let ecart = 0
  let glisse = false

  poignee.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return
    depart = { y: e.clientY, t: e.timeStamp }
    ecart = 0
    glisse = false
    poignee.setPointerCapture(e.pointerId)
  })

  poignee.addEventListener('pointermove', (e) => {
    if (!depart) return
    ecart = Math.min(0, e.clientY - depart.y)
    if (!glisse && ecart > -SEUIL_DEPART) return
    glisse = true
    // La feuille suit le doigt, sans transition
    feuille.style.transition = 'none'
    feuille.style.transform = `translateY(${ecart}px)`
  })

  const relacher = (e: PointerEvent) => {
    if (!depart) return
    const vitesse = -ecart / Math.max(1, e.timeStamp - depart.t)
    depart = null
    if (!glisse) return
    // Rend la main aux transitions de la feuille : elle repart de la
    // position du doigt, vers le haut (fermeture) ou vers 0 (retour)
    feuille.style.transition = ''
    feuille.style.transform = ''
    if (-ecart > feuille.offsetHeight / 4 || vitesse > VITESSE_FERMETURE) fermer()
  }

  poignee.addEventListener('pointerup', relacher)
  poignee.addEventListener('pointercancel', relacher)

  poignee.addEventListener('click', () => {
    // Le clic qui suit un glissé est déjà traité par relacher
    if (glisse) {
      glisse = false
      return
    }
    fermer()
  })
}
