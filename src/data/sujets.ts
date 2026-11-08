/*
 * Sujets des nouvelles et de la revue de presse. Un sujet regroupe les
 * actualités d'une bibliothèque ou d'un thème : /nouvelles/?sujet=<id>
 * n'affiche que les siennes (ListeNouvelles), et une page peut y renvoyer
 * (la Bibliothèque des livres rares, bouton « Consulter la revue de presse »).
 *
 * Une nouvelle le déclare dans son frontmatter (`sujets: [livres-rares]`), un
 * article de presse dans src/content/revue-de-presse/articles.json. Un
 * identifiant absent d'ici fait échouer le build (content.config.ts).
 */
export const SUJETS = [{ id: 'livres-rares', libelle: 'Livres rares et collections spéciales' }] as const

export type IdSujet = (typeof SUJETS)[number]['id']

export const IDS_SUJETS = SUJETS.map((s) => s.id) as [IdSujet, ...IdSujet[]]
