/*
 * Répertoire du personnel, côté navigateur : recherche, filtres par
 * bibliothèque et par discipline, ancre de l'URL, ?q= et pagination, en
 * amélioration progressive de la liste rendue au build
 * (RepertoirePersonnel.astro). Le filtre et le calcul des pages sont dans
 * filtre.ts (fonctions pures, testées).
 */
import { cle } from './normaliser'
import { filtrer, paginer, suite, texteStatut } from './filtre'
import { focaliserTemporairement } from '@/lib/focus'
import { idDeLAncre } from '@/lib/ancre-url'

// Délai avant d'annoncer le nombre de résultats pendant la frappe : une
// annonce par pause plutôt qu'une par lettre.
const DELAI_ANNONCE = 600

export function initialiser(racine: HTMLElement) {
  const formulaire = racine.querySelector<HTMLFormElement>('[data-filtres]')!
  const recherche = racine.querySelector<HTMLInputElement>('[data-recherche]')!
  const filtres = [...racine.querySelectorAll<HTMLSelectElement>('[data-filtre]')]
  const [filtreBib] = filtres
  const statut = racine.querySelector<HTMLElement>('[data-statut]')!
  const liste = racine.querySelector<HTMLElement>('[data-liste]')!
  const fiches = [...liste.querySelectorAll<HTMLElement>(':scope > li')]
  const navigation = racine.querySelector<HTMLElement>('[data-pagination]')!
  const pages = racine.querySelector<HTMLElement>('[data-pages]')!
  const actifs = racine.querySelector<HTMLElement>('[data-actifs]')!
  const iconeRetirer = racine.querySelector<HTMLTemplateElement>('[data-icone-retirer]')!
  const ancres: Record<string, string> = JSON.parse(racine.dataset.ancres ?? '{}')

  let page = 1
  let minuterie: number | undefined

  // Ancre → filtre bibliothèque ; renvoie vrai si l'ancre en désignait une
  function lireAncre() {
    const ancre = idDeLAncre()
    const valeur = ancre && ancres[cle(ancre)]
    if (!valeur) return false
    filtreBib.value = valeur
    return true
  }

  // replaceState : choisir un filtre ne crée pas d'entrée d'historique et
  // ne fait pas défiler la page (la source faisait les deux).
  function ecrireAncre() {
    const option = filtreBib.selectedOptions[0]
    const base = location.pathname + location.search
    const ancre = filtreBib.value ? `#${option.dataset.ancre ?? encodeURIComponent(option.textContent?.trim() ?? '')}` : ''
    history.replaceState(history.state, '', base + ancre)
  }

  function rendrePuces() {
    actifs.replaceChildren()
    for (const filtre of filtres) {
      if (!filtre.value) continue
      const libelle = filtre.selectedOptions[0].textContent?.trim() ?? ''
      const bouton = document.createElement('button')
      bouton.type = 'button'
      bouton.className = 'puce'
      bouton.setAttribute('aria-label', `Retirer le filtre : ${libelle}`)
      const texte = document.createElement('span')
      texte.textContent = libelle
      bouton.append(texte, iconeRetirer.content.cloneNode(true))
      bouton.addEventListener('click', () => {
        filtre.value = ''
        if (filtre === filtreBib) ecrireAncre()
        page = 1
        rendre()
        // La puce disparaît : le focus revient sur la liste correspondante
        filtre.focus()
      })
      actifs.append(bouton)
    }
    actifs.hidden = actifs.childElementCount === 0
  }

  function rendrePagination(nombrePages: number) {
    navigation.hidden = nombrePages <= 1
    pages.replaceChildren()
    if (nombrePages <= 1) return
    const element = (contenu: Node | string, cible: number | null, libelle: string, courant = false) => {
      const li = document.createElement('li')
      const bouton = document.createElement('button')
      bouton.type = 'button'
      bouton.setAttribute('aria-label', libelle)
      bouton.append(contenu)
      // La page courante reste focalisable pour qu'on sache où l'on est
      if (courant) bouton.setAttribute('aria-current', 'page')
      else if (cible === null) bouton.disabled = true
      else bouton.addEventListener('click', () => allerA(cible))
      li.append(bouton)
      return li
    }
    const fleche = (sens: 'precedente' | 'suivante') => {
      const span = document.createElement('span')
      span.className = `fleche fleche-${sens}`
      span.setAttribute('aria-hidden', 'true')
      return span
    }
    pages.append(element(fleche('precedente'), page > 1 ? page - 1 : null, 'Page précédente'))
    for (const item of suite(page, nombrePages)) {
      let li: HTMLLIElement
      if ('ellipse' in item) {
        li = document.createElement('li')
        li.className = 'ellipse'
        li.setAttribute('aria-hidden', 'true')
        li.textContent = '…'
      } else {
        const { numero } = item
        li = element(String(numero), numero === page ? null : numero, `Page ${numero}`, numero === page)
      }
      if (item.seulement) li.classList.add(`seulement-${item.seulement}`)
      pages.append(li)
    }
    pages.append(element(fleche('suivante'), page < nombrePages ? page + 1 : null, 'Page suivante'))
  }

  function allerA(numero: number) {
    page = numero
    rendre()
    // Le focus passe au début de la nouvelle page de résultats
    racine.scrollIntoView({ block: 'start' })
    focaliserTemporairement(liste, { preventScroll: true })
  }

  function rendre(annonceDifferee = false) {
    const [bib, discipline] = filtres.map((f) => f.value)
    const retenues = filtrer(fiches, { recherche: recherche.value, bibliotheque: bib, discipline }, (fiche) => fiche.dataset)
    const pagination = paginer(retenues, page)
    page = pagination.page
    const { nombrePages } = pagination
    const visibles = new Set(pagination.visibles)
    for (const fiche of fiches) fiche.hidden = !visibles.has(fiche)
    liste.hidden = visibles.size === 0

    rendrePuces()
    rendrePagination(nombrePages)

    window.clearTimeout(minuterie)
    const texte = texteStatut(retenues.length, page, nombrePages)
    if (annonceDifferee) minuterie = window.setTimeout(() => (statut.textContent = texte), DELAI_ANNONCE)
    else statut.textContent = texte
  }

  formulaire.addEventListener('submit', (e) => e.preventDefault())

  const q = new URLSearchParams(location.search).get('q')
  if (q) recherche.value = q
  lireAncre()
  rendre()

  recherche.addEventListener('input', () => {
    page = 1
    rendre(true)
  })
  for (const filtre of filtres) {
    filtre.addEventListener('change', () => {
      if (filtre === filtreBib) ecrireAncre()
      page = 1
      rendre()
    })
  }
  window.addEventListener('hashchange', () => {
    if (!lireAncre()) return
    page = 1
    rendre()
  })
}
