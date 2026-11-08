/*
 * Planche d'icônes (sprite SVG) : chaque icône répétée n'est écrite qu'une
 * fois par page, dans un <symbol>, et chaque usage devient
 * <svg …><use href="#icone-…"/></svg>. Le répertoire du personnel répétait
 * les mêmes trois icônes 140 fois (≈ 260 Ko de HTML).
 *
 * Les composants enregistrent leurs symboles pendant le rendu, dans un
 * registre propre à la page (clé : Astro.locals, le même objet pour toute la
 * requête) ; src/middleware.ts écrit la planche avant </body> une fois la page
 * entièrement rendue. Astro rend les composants frères en parallèle : un
 * composant placé en fin de page ne verrait pas forcément tous les symboles,
 * d'où le middleware.
 *
 * Les îlots Preact (src/components/ilots) gardent leurs SVG en ligne : ils se
 * réhydratent côté client, sans le registre.
 */
import { createHash } from 'node:crypto'
// Les icônes Phosphor sont des composants React, servis par preact/compat
// (alias de @astrojs/preact, voir ssr.noExternal d'astro.config.mjs)
import { createElement } from 'preact'
import { renderToStaticMarkup } from 'preact-render-to-string'
import { ICONE_ANCRE, ID_ICONE_ANCRE } from './ancres'

interface Symbole {
  viewBox: string
  contenu: string
}

const registres = new WeakMap<object, Map<string, Symbole>>()

/**
 * Symboles toujours connus, écrits hors des composants (le plugin rehype des
 * titres Markdown ne voit pas Astro.locals) : la planche les reprend dès que
 * la page y fait référence.
 */
const SYMBOLES_STATIQUES: Record<string, Symbole> = {
  [ID_ICONE_ANCRE]: { viewBox: '0 0 256 256', contenu: `<path d="${ICONE_ANCRE}"></path>` },
}

/**
 * Enregistre un symbole pour la page en cours et rend son identifiant.
 * Sans `id`, il est tiré du contenu : deux dessins identiques partagent un
 * symbole, deux dessins différents n'entrent jamais en collision.
 */
export function enregistrerSymbole(locals: object, viewBox: string, contenu: string, id?: string) {
  const ident = id ?? `icone-${createHash('sha1').update(`${viewBox}|${contenu}`).digest('hex').slice(0, 10)}`
  let registre = registres.get(locals)
  if (!registre) registres.set(locals, (registre = new Map()))
  registre.set(ident, { viewBox, contenu })
  return ident
}

/** Planche de la page : les symboles enregistrés et les symboles statiques cités par le HTML */
export function planche(locals: object, html: string) {
  const symboles = new Map(registres.get(locals))
  for (const [id, symbole] of Object.entries(SYMBOLES_STATIQUES)) if (html.includes(`href="#${id}"`)) symboles.set(id, symbole)
  if (!symboles.size) return ''
  const contenu = [...symboles].map(([id, { viewBox, contenu }]) => `<symbol id="${id}" viewBox="${viewBox}">${contenu}</symbol>`).join('')
  // Hors du flux et de l'arbre d'accessibilité ; pas de display: none, qui
  // empêche certains navigateurs de peindre les dégradés et masques référencés
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;overflow:hidden">${contenu}</svg>`
}

export type Graisse = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

// Dessins Phosphor déjà rendus, communs à toutes les pages du build
const DESSINS = new Map<string, Symbole>()

/**
 * Symbole d'une icône Phosphor (composant de `@phosphor-icons/react/dist/ssr`)
 * pour la page en cours. L'identifiant suit le nom de l'icône et sa graisse
 * (`icone-arrow-right-bold`) : lisible dans le HTML.
 */
export function symbolePhosphor(locals: object, composant: { displayName: string }, graisse: Graisse) {
  const nom = composant.displayName.replace(/Icon$/, '').replace(/[a-z0-9](?=[A-Z])/g, (c) => `${c}-`).toLowerCase()
  const id = `icone-${nom}-${graisse}`
  let dessin = DESSINS.get(id)
  if (!dessin) {
    const svg = renderToStaticMarkup(createElement(composant as never, { weight: graisse }))
    const [, attributs = '', contenu = ''] = /^<svg([^>]*)>([\s\S]*)<\/svg>$/.exec(svg) ?? []
    dessin = { viewBox: /viewBox="([^"]+)"/.exec(attributs)?.[1] ?? '0 0 256 256', contenu }
    DESSINS.set(id, dessin)
  }
  enregistrerSymbole(locals, dessin.viewBox, dessin.contenu, id)
  return { id, viewBox: dessin.viewBox }
}
