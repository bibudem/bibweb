/*
 * Préfixe d'un site publié dans un sous-dossier (GitHub Pages :
 * https://bibudem.github.io/bibweb/). `base` d'Astro (astro.config.mjs, variable
 * BASE_PATH) vaut alors « /bibweb » ; il vaut « / » partout ailleurs.
 *
 * Les liens du HTML produit sont préfixés en fin de build
 * (src/plugins/base-sous-dossier.mjs). avecBase() sert au code qui fabrique
 * une adresse dans le navigateur : îlots React (qui recréent leurs liens à
 * l'hydratation) et scripts (fetch de l'index de recherche). sansBase()
 * rend le chemin d'une page sans le préfixe, pour le code qui le compare aux
 * adresses du site (fil d'Ariane, page courante, adresse canonique).
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Ajoute le préfixe à une adresse « à la racine » (/horaires/) ; les autres passent telles quelles */
export function avecBase(adresse: string): string
export function avecBase(adresse: string | undefined): string | undefined
export function avecBase(adresse: string | undefined) {
  if (!BASE || !adresse?.startsWith('/') || adresse.startsWith('//') || adresse.startsWith(`${BASE}/`)) return adresse
  return `${BASE}${adresse}`
}

/** Chemin de la page sans le préfixe (/bibweb/horaires/ donne /horaires/) */
export function sansBase(chemin: string) {
  return BASE && chemin.startsWith(`${BASE}/`) ? chemin.slice(BASE.length) : chemin
}
