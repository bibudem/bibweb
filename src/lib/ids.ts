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

// Composants déjà rendus dans la page, par nom (clé : Astro.locals, un
// objet propre à chaque page)
const rangs = new WeakMap<object, Map<string, number>>()

/** Rang (1, 2…) de ce rendu de `nom` dans la page de `locals` */
export function rangDansLaPage(locals: object, nom: string) {
  const parNom = rangs.get(locals) ?? new Map<string, number>()
  rangs.set(locals, parNom)
  const rang = (parNom.get(nom) ?? 0) + 1
  parNom.set(nom, rang)
  return rang
}
