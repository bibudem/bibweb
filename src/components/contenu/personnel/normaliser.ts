/*
 * Normalisation du texte du répertoire du personnel. Le même module sert au
 * build (attributs data-* des cartes, valeurs des listes) et au script du
 * navigateur (texte tapé, ancre de l'URL) : une seule définition garantit
 * que les deux côtés comparent exactement les mêmes chaînes.
 */
import { sansAccents } from '../../../lib/texte.mjs'

/** Sans accents, en minuscules, sans apostrophes, espaces réduites à une seule */
export function normaliserMots(texte = '') {
  return sansAccents(String(texte))
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Clé de comparaison tolérante : comme normaliserMots, sans ponctuation ni
 * espaces, et sans le « s » final des mots. Le tableur écrit
 * « mathématiques et informatiques » alors que la fiche de la bibliothèque
 * dit « informatique » : sans cette tolérance, l'ancre #math-info ne
 * trouvait rien dans coquille-web.
 */
export function cle(texte = '') {
  return normaliserMots(texte)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((mot) => (mot.length > 3 ? mot.replace(/s$/, '') : mot))
    .join('')
}

/** Première lettre en majuscule, le reste tel quel */
export function majuscule(texte = '') {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/** Séparateur des listes dans les attributs data-* (absent des données) */
export const SEPARATEUR = '|'

