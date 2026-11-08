/*
 * Outils des listes chargées dans le navigateur (événements, formations).
 * Les flux ne sont pas lus au build : ils changent tous les jours et le
 * site n'est pas reconstruit aussi souvent.
 */

/** GET avec un délai par tentative ; réessaie avant d'abandonner */
export async function chargerAvecDelai<T>(url: string, lire: (reponse: Response) => Promise<T>, { delai = 5000, tentatives = 1 } = {}): Promise<T> {
  for (let tentative = 1; ; tentative++) {
    try {
      const reponse = await fetch(url, { signal: AbortSignal.timeout(delai) })
      if (!reponse.ok) throw new Error(`Erreur HTTP ${reponse.status}`)
      return await lire(reponse)
    } catch (erreur) {
      // Le détail reste dans la console ; le visiteur voit un message clair
      console.error(`Chargement de ${url} (tentative ${tentative}/${tentatives}) :`, erreur)
      if (tentative >= tentatives) throw erreur
    }
  }
}

/** Copie du premier élément d'un <template> */
export function cloner(gabarit: HTMLTemplateElement) {
  return gabarit.content.firstElementChild!.cloneNode(true) as HTMLElement
}

/**
 * Remplit un élément cloné : lien, titre et, s'il y a lieu, la vignette.
 * `repli` est l'image décorative à montrer quand l'élément n'a pas d'image
 * ou que la sienne ne se charge pas ; sans repli, le carré reste vide.
 */
export function remplir(element: HTMLElement, { url, titre, image, repli }: { url: string; titre: string; image?: string; repli?: string }) {
  element.querySelector<HTMLAnchorElement>('[data-champ="lien"]')?.setAttribute('href', url)
  const champTitre = element.querySelector('[data-champ="titre"]')
  if (champTitre) champTitre.textContent = titre
  const vignette = element.querySelector('[data-champ="vignette"]')
  const source = image || repli
  if (vignette && source) {
    const img = document.createElement('img')
    img.alt = ''
    img.loading = 'lazy'
    img.decoding = 'async'
    img.width = 300
    img.height = 300
    // Image introuvable : on passe au repli, sinon on garde le carré vide
    // plutôt qu'une icône cassée (et on ne boucle pas si le repli échoue).
    img.addEventListener('error', function surErreur() {
      if (repli && img.getAttribute('src') !== repli) img.src = repli
      else {
        img.removeEventListener('error', surErreur)
        img.remove()
      }
    })
    img.src = source
    vignette.append(img)
  }
}

/** Montre l'un des états d'une liste (data-etat) et masque les autres */
export function montrerEtat(racine: HTMLElement, etat: string) {
  for (const el of racine.querySelectorAll<HTMLElement>('[data-etat]')) el.hidden = el.dataset.etat !== etat
  racine.setAttribute('aria-busy', String(etat === 'chargement'))
}

/**
 * Branche le bouton « Réessayer » d'un état d'erreur (EtatErreur.astro). Le
 * bouton disparaît pendant le nouveau chargement : le focus passe au conteneur
 * plutôt que de se perdre en haut de la page.
 */
export function brancherReessayer(racine: HTMLElement, charger: () => void) {
  racine.querySelector('[data-reessayer]')?.addEventListener('click', () => {
    racine.tabIndex = -1
    racine.dataset.focusProgramme = ''
    racine.focus()
    charger()
  })
}
