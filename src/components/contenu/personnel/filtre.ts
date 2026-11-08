/*
 * Filtre et pagination du répertoire du personnel : fonctions pures, sans
 * DOM, testées par filtre.test.ts. Le script du navigateur (repertoire.ts)
 * les applique aux fiches rendues au build.
 *
 * Import avec l'extension .ts : `node --test` charge ce module tel quel.
 */
import { normaliserMots, SEPARATEUR } from './normaliser.ts'

/** Fiches par page, comme dans la source */
export const PAR_PAGE = 8

/** Données d'une fiche, telles que ses attributs data-* (dataset) les donnent */
export interface DonneesFiche {
  texte?: string
  bibliotheque?: string
  discipline?: string
}

export interface Criteres {
  /** Texte tapé dans le champ de recherche, brut */
  recherche: string
  /** Clé de la bibliothèque ou de la direction choisie ('' : toutes) */
  bibliotheque: string
  /** Clé de la discipline ou de l'expertise choisie ('' : toutes) */
  discipline: string
}

/** Mots cherchés : texte normalisé (sans accents ni casse), découpé aux espaces */
export function jetonsDe(recherche: string): string[] {
  return normaliserMots(recherche).split(' ').filter(Boolean)
}

/**
 * Fiches retenues : celles qui contiennent tous les mots cherchés (en début,
 * milieu ou fin de mot) et appartiennent à la bibliothèque et à la
 * discipline choisies. Les listes des attributs data-* sont séparées par
 * SEPARATEUR. `donnees` lit les données d'une fiche (son dataset).
 */
export function filtrer<T>(fiches: T[], { recherche, bibliotheque, discipline }: Criteres, donnees: (fiche: T) => DonneesFiche): T[] {
  const jetons = jetonsDe(recherche)
  return fiches.filter((fiche) => {
    const { texte = '', bibliotheque: bibs = '', discipline: disciplines = '' } = donnees(fiche)
    return (
      jetons.every((jeton) => texte.includes(jeton)) &&
      (!bibliotheque || bibs.split(SEPARATEUR).includes(bibliotheque)) &&
      (!discipline || disciplines.split(SEPARATEUR).includes(discipline))
    )
  })
}

/**
 * Page demandée ramenée dans les bornes (un filtre plus strict peut
 * supprimer la page où l'on était), nombre de pages (au moins une) et
 * éléments de la page.
 */
export function paginer<T>(retenues: T[], page: number, parPage = PAR_PAGE) {
  const nombrePages = Math.max(1, Math.ceil(retenues.length / parPage))
  const courante = Math.min(page, nombrePages)
  return { page: courante, nombrePages, visibles: retenues.slice((courante - 1) * parPage, courante * parPage) }
}

/** Texte de la région role="status" : nombre de résultats et page */
export function texteStatut(nombre: number, page: number, pages: number) {
  if (nombre === 0) return 'Aucune personne ne correspond à ces critères.'
  const personnes = nombre === 1 ? '1 personne' : `${nombre} personnes`
  return pages > 1 ? `${personnes}, page ${page} sur ${pages}` : personnes
}

// Numéros affichés, comme la pagination MUI de la source : premières et
// dernières pages, la page courante et ses voisines, des ellipses entre.
// `voisines` : pages montrées de chaque côté de la page courante (siblingCount
// de MUI, boundaryCount 1). Le nombre de cases reste constant (2 × voisines
// + 5) : une ellipse ne remplace jamais une seule page.
export function numeros(page: number, pages: number, voisines: number): number[] {
  if (pages <= 2 * voisines + 5) return Array.from({ length: pages }, (_, i) => i + 1)
  const debut = Math.max(Math.min(page - voisines, pages - 2 * voisines - 2), 3)
  const fin = Math.min(Math.max(page + voisines, 2 * voisines + 3), pages - 2)
  const milieu = Array.from({ length: fin - debut + 1 }, (_, i) => debut + i)
  return [1, ...(debut > 3 ? [] : [2]), ...milieu, ...(fin < pages - 2 ? [] : [pages - 1]), pages]
}

// Sous 600 px, des boutons de 44 px (cible tactile) ne tiennent sur une
// rangée que sans les voisines de la page courante : on rend les deux
// suites (larges, une voisine ; compactes, aucune) dans une seule liste,
// et le CSS masque ce qui n'appartient qu'à l'une (display: none, donc
// absent aussi de l'arbre d'accessibilité). Pas de choix en JS selon la
// largeur : rien ne bouge au redimensionnement.
export type Case = ({ numero: number } | { ellipse: true }) & { seulement?: 'large' | 'compacte' }

export function suite(page: number, pages: number): Case[] {
  const larges = numeros(page, pages, 1)
  const compactes = numeros(page, pages, 0)
  const tous = [...new Set([...larges, ...compactes])].sort((a, b) => a - b)
  const resultat: Case[] = []
  const saut = (liste: number[], n: number) => {
    const i = liste.indexOf(n)
    return i >= 0 && i < liste.length - 1 && liste[i + 1] - n > 1
  }
  for (const n of tous) {
    const dansLarges = larges.includes(n)
    const dansCompactes = compactes.includes(n)
    resultat.push({ numero: n, seulement: dansLarges && dansCompactes ? undefined : dansLarges ? 'large' : 'compacte' })
    const sautLarge = saut(larges, n)
    const sautCompact = saut(compactes, n)
    if (sautLarge || sautCompact) resultat.push({ ellipse: true, seulement: sautLarge && sautCompact ? undefined : sautLarge ? 'large' : 'compacte' })
  }
  return resultat
}
