/*
 * Identifiants uniques au rendu : jeux d'onglets, groupes d'accordéons,
 * carrousels, liens des cartes (aria-describedby), colonnes sans `id`.
 * Le compteur vit dans le module : le frontmatter d'un .astro est réexécuté
 * à chaque rendu et ne peut pas le garder. Il suit l'ordre de rendu, qui est
 * déterministe au build.
 */
let compteur = 0

export function idUnique(prefixe: string) {
  compteur += 1
  return `${prefixe}-${compteur.toString(36)}`
}
