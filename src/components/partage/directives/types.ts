/*
 * Arbre des directives d'une page Markdown, lu par lireMarqueurs
 * (src/plugins/marqueurs-directives.mjs) et rendu par RenduDirectives.astro
 * et les composants de ce dossier.
 */
export type Attributs = Record<string, any>
export type Directive = { nom: string; attributs: Attributs; enfants: Noeud[] }
/** Du HTML déjà rendu, ou une directive */
export type Noeud = string | Directive

export const estDirective = (noeud: Noeud): noeud is Directive => typeof noeud !== 'string'
export const directives = (liste: Noeud[]) => liste.filter(estDirective)
