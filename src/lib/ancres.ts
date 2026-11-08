import GithubSlugger from 'github-slugger'

/*
 * Ancres des titres, source unique de l'icône et de l'identifiant : les
 * titres de vitrine (Titre.astro) et src/plugins/rehype-ancres-titres.mjs
 * (titres Markdown) les importent tous deux, pour que /page/#section soit
 * calculé de la même façon partout (accents retirés, puis github-slugger).
 */

/** Icône « lien » de Phosphor (256 × 256) */
export const ICONE_ANCRE = 'M117.18 188.74a12 12 0 0 1 0 17l-5.12 5.12A58.26 58.26 0 0 1 70.6 228a58.62 58.62 0 0 1-41.46-100.08l34.75-34.75a58.64 58.64 0 0 1 98.56 28.11a12 12 0 1 1-23.37 5.44a34.65 34.65 0 0 0-58.22-16.58l-34.75 34.75A34.62 34.62 0 0 0 70.57 204a34.4 34.4 0 0 0 24.49-10.14l5.11-5.12a12 12 0 0 1 17.01 0m109.68-161.6a58.66 58.66 0 0 0-82.94 0l-5.12 5.11a12 12 0 0 0 17 17l5.12-5.12a34.63 34.63 0 1 1 49 49l-34.76 34.76a34.63 34.63 0 0 1-58.22-16.58a12 12 0 0 0-23.37 5.44a58.64 58.64 0 0 0 98.56 28.11l34.75-34.75a58.62 58.62 0 0 0-.02-82.97'

/** Symbole de l'icône dans la planche de la page (src/lib/sprite.ts) */
export const ID_ICONE_ANCRE = 'icone-ancre'

/** Nom accessible du lien d'ancre placé à la fin d'un titre */
export const nomLienAncre = (texte: string) => `Lien vers la section « ${texte} »`

/**
 * Texte d'un titre sans le nom de son lien d'ancre : les titres que donne
 * render() (sommaire d'une page) incluent le texte masqué du lien.
 */
export function texteSansAncre(texte: string) {
  const debut = texte.slice(0, texte.lastIndexOf(nomLienAncre('').slice(0, -3)))
  return debut && texte === debut + nomLienAncre(debut) ? debut : texte
}

/** Équivalent de lodash.deburr pour les lettres latines accentuées */
import { sansAccents } from './texte.mjs'

export { sansAccents }

/**
 * Identifiant d'ancre d'un titre. `slugger` (un par page) numérote les
 * doublons (#titre, #titre-1) ; sans lui, le titre est pris isolément.
 */
export function idDeTitre(texte: string, slugger = new GithubSlugger()) {
  return slugger.slug(sansAccents(texte))
}
