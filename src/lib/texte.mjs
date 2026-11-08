/*
 * Petites fonctions de texte partagées par le site (serveur et navigateur) et
 * par les scripts Node (scripts/indexer-externes.mjs). Sans dépendance : en
 * JavaScript simple pour être importable partout.
 */

/** « Événement » → « Evenement » (les accents seulement ; la casse est gardée) */
export const sansAccents = (texte) => texte.normalize('NFD').replace(/\p{Diacritic}/gu, '')

/**
 * Coupe un texte à `longueur` caractères au plus, à la fin d'un mot, sans
 * ponctuation pendante, et termine par « … ». Un texte assez court est
 * rendu tel quel.
 */
export function couper(texte, longueur) {
  if (texte.length <= longueur) return texte
  const coupe = texte.slice(0, longueur + 1)
  const fin = coupe.lastIndexOf(' ')
  const debut = fin > longueur * 0.6 ? coupe.slice(0, fin) : texte.slice(0, longueur)
  return `${debut.replace(/[\s,;:.–-]+$/, '')}…`
}

/**
 * Chaque mot une fois (casse ignorée, première forme gardée) : le champ
 * `words` des index de recherche, pour que « Sofia » ou « citer » trouvent
 * une page sans gonfler l'index.
 */
export function motsDistincts(texte) {
  const vus = new Map()
  for (const mot of texte.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []) {
    const cle = mot.toLowerCase()
    if (!vus.has(cle)) vus.set(cle, mot)
  }
  return [...vus.values()].join(' ')
}
