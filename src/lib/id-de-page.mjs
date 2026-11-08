/*
 * Identifiant (donc URL) d'une page de src/content/pages, d'après son chemin
 * relatif : l'extension retirée, le nom de fichier passé dans slugify (comme
 * Gatsby), le chemin des dossiers gardé tel quel, `index` donnant le dossier.
 *
 * En JavaScript simple : partagé par src/content.config.ts, astro.config.mjs
 * (pages hors du plan du site) et scripts/verifier-pages.mjs (Node seul).
 */
import slugify from '@sindresorhus/slugify'

/** `obtenir/peb/index.md` → `obtenir/peb` ; `index.yaml` → `index` */
export function idDePage(chemin) {
  const segments = chemin.replace(/\.(mdx?|yaml)$/i, '').split('/')
  const nom = segments.pop() ?? ''
  const fin = /^index$/i.test(nom) ? '' : slugify(nom)
  return [...segments, fin].filter(Boolean).join('/') || 'index'
}

/** URL publique d'un identifiant de page : `index` → `/`, `obtenir/peb` → `/obtenir/peb/` */
export function urlDeId(id) {
  return id === 'index' ? '/' : `/${id}/`
}
