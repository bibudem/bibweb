/*
 * Composants disponibles dans tout le MDX sans import (équivalent de
 * src/templates/commonComponents.js dans coquille-web).
 *
 * Chaque famille de composants a son dossier src/components/contenu/<famille>/
 * et un index.ts qui exporte ses composants sous leur nom MDX
 * (`export { default as Section } from './Section.astro'`) ; les primitives
 * (src/components/primitives/, partagées avec la coquille et les vitrines)
 * ont le leur. On les réunit ici automatiquement, pour que des familles
 * écrites en parallèle n'aient jamais à modifier le même fichier.
 */
const familles = import.meta.glob<Record<string, unknown>>(['./*/index.ts', '../primitives/index.ts'], { eager: true })

export const composantsMdx: Record<string, unknown> = Object.assign({}, ...Object.values(familles))
