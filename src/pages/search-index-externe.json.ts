import type { APIRoute } from 'astro'
import studio from '@/data/recherche/studio.json'
import boiteOutils from '@/data/recherche/boite-outils.json'

/*
 * Index des sites voisins pour la recherche bento : pages de la Boîte à
 * outils et de Studio·bib, relevées par scripts/indexer-externes.mjs (ni
 * l'un ni l'autre ne se laisse interroger depuis notre domaine). Séparé de
 * /search-index.json, quatre fois plus lourd : la boîte de recherche montre
 * les résultats du site sans l'attendre. Mêmes champs, section comprise ;
 * les adresses sont absolues.
 */

export const prerender = true

export const GET: APIRoute = () => {
  const entrees = [
    ...boiteOutils.entrees.map((entree) => ({ ...entree, section: 'outils' })),
    ...studio.entrees.map((entree) => ({ ...entree, section: 'studio' })),
  ]
  return new Response(JSON.stringify(entrees), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
