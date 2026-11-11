/*
 * Comportement commun des carrousels à défilement natif (scroll-snap) du site :
 * cartes à révélation et cartes à photo (Carrousel), cartes-sections de
 * l'accueil sur mobile (BlocCartesSections). Il réunit les deux versions qui
 * coexistaient (flèches cerclées sans annonce d'un côté ; chevrons, points et
 * annonce de l'autre), pour que le même geste donne partout les mêmes
 * commandes et les mêmes annonces.
 *
 * Dans `racine` :
 * - `[data-piste]` : la rangée qui défile ; ses enfants sont les diapositives ;
 * - `[data-precedent]`, `[data-suivant]` : flèches (BoutonsCarrousel), en
 *   aria-disabled aux extrémités ;
 * - `[data-commandes]` (facultatif) : masqué quand tout tient dans la largeur ;
 * - `[data-progression]` et `[data-curseur]` (ProgressionCarrousel) : barre
 *   de position, le curseur a la largeur de la part visible ;
 * - `[data-position]` : région role="status", qui annonce les diapositives
 *   visibles après un clic sur une flèche (« Cartes 3 et 4 sur 8 »).
 *
 * Une flèche avance d'une « page » : la première diapositive coupée à droite
 * vient au début, ou l'inverse en reculant (slidesToScroll de la source).
 * Tant qu'il reste des diapositives à droite, la piste porte `data-suite`
 * (fondu du bord droit, au choix du composant). Sans JavaScript, la rangée se
 * parcourt au doigt, au trackpad ou à la barre de défilement.
 */
const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `signal` (lib/pages.ts) débranche l'observateur quand la page est quittée */
export function brancherCarrousel(racine: HTMLElement, signal?: AbortSignal) {
  const piste = racine.querySelector<HTMLElement>('[data-piste]')
  if (!piste) return
  const diapositives = [...piste.children] as HTMLElement[]
  const precedent = racine.querySelector<HTMLButtonElement>('[data-precedent]')
  const suivant = racine.querySelector<HTMLButtonElement>('[data-suivant]')
  const commandes = racine.querySelector<HTMLElement>('[data-commandes]')
  const progression = racine.querySelector<HTMLElement>('[data-progression]')
  const curseur = racine.querySelector<HTMLElement>('[data-curseur]')
  const position = racine.querySelector<HTMLElement>('[data-position]')

  // Diapositives visibles à plus de moitié, en numéros à partir de 1
  const visibles = () => {
    const p = piste.getBoundingClientRect()
    const numeros = diapositives
      .map((d, i) => ({ r: d.getBoundingClientRect(), i }))
      .filter(({ r }) => Math.min(r.right, p.right) - Math.max(r.left, p.left) > r.width / 2)
      .map(({ i }) => i + 1)
    return numeros.length ? numeros : [1]
  }

  const annoncer = () => {
    if (!position) return
    const v = visibles()
    const total = diapositives.length
    const etendue = v.length === 1 ? `Carte ${v[0]}` : v.length === 2 ? `Cartes ${v[0]} et ${v[1]}` : `Cartes ${v[0]} à ${v.at(-1)}`
    position.textContent = `${etendue} sur ${total}`
  }

  let annonceDemandee = false
  let minuterie: number | undefined

  // Tolérance d'un pixel : les largeurs fractionnaires laissent un reste
  const maj = () => {
    const max = piste.scrollWidth - piste.clientWidth
    const defile = max > 1
    if (commandes) commandes.hidden = !defile
    precedent?.setAttribute('aria-disabled', String(piste.scrollLeft <= 1))
    suivant?.setAttribute('aria-disabled', String(piste.scrollLeft >= max - 1))
    piste.toggleAttribute('data-suite', piste.scrollLeft < max - 1)
    if (progression) progression.hidden = !defile
    if (curseur && defile) {
      curseur.style.width = `${(piste.clientWidth / piste.scrollWidth) * 100}%`
      curseur.style.transform = `translateX(${(Math.min(piste.scrollLeft, max) / piste.clientWidth) * 100}%)`
    }
    // Annonce une fois le défilement arrêté, et seulement s'il vient d'une flèche
    if (annonceDemandee) {
      window.clearTimeout(minuterie)
      minuterie = window.setTimeout(() => {
        annonceDemandee = false
        annoncer()
      }, 200)
    }
  }

  const aller = (sens: 1 | -1) => {
    const debut = piste.getBoundingClientRect().left
    const positions = diapositives.map((d) => d.getBoundingClientRect().left - debut + piste.scrollLeft)
    const gauche = piste.scrollLeft
    let cible: number
    if (sens === 1) {
      const bord = gauche + piste.clientWidth
      const i = diapositives.findIndex((d, n) => positions[n] + d.offsetWidth > bord + 1)
      // Une diapositive plus large que la piste, déjà au début : la suivante
      const j = i !== -1 && positions[i] <= gauche + 1 ? i + 1 : i
      cible = j === -1 || j >= positions.length ? piste.scrollWidth : positions[j]
    } else {
      cible = positions.find((p) => p >= gauche - piste.clientWidth - 1) ?? 0
      if (cible >= gauche - 1) cible = [...positions].reverse().find((p) => p < gauche - 1) ?? 0
    }
    // Les marges intérieures de la piste (scroll-padding) décalent l'accroche
    cible -= parseFloat(getComputedStyle(piste).scrollPaddingInlineStart) || 0
    annonceDemandee = true
    piste.scrollTo({ left: Math.max(0, cible), behavior: reduit() ? 'auto' : 'smooth' })
    maj()
  }

  precedent?.addEventListener('click', () => precedent.getAttribute('aria-disabled') !== 'true' && aller(-1))
  suivant?.addEventListener('click', () => suivant.getAttribute('aria-disabled') !== 'true' && aller(1))
  piste.addEventListener('scroll', maj, { passive: true })
  const taille = new ResizeObserver(maj)
  taille.observe(piste)
  signal?.addEventListener('abort', () => {
    taille.disconnect()
    window.clearTimeout(minuterie)
  })
  racine.toggleAttribute('data-pret', true)
  maj()
}
