/*
 * Marqueurs qui portent les directives d'une page Markdown jusqu'au rendu.
 *
 * Un fichier .md est rendu en HTML par le processeur Markdown d'Astro, qui ne
 * connaît pas les composants. Les directives (:::modalites, ::bouton…)
 * deviennent donc des commentaires HTML ouvrants et fermants autour de leur
 * contenu ; src/components/partage/RenduDirectives.astro les relit et rend
 * à leur place les mêmes composants que le MDX (Modalites, Bouton, Alerte…).
 * Les pages Markdown ont ainsi exactement le balisage et les styles des
 * pages MDX, sans copie de CSS.
 *
 * Les attributs sont en JSON encodé en base64 : l'alphabet (A-Z a-z 0-9 + / =)
 * ne peut ni fermer le commentaire (`-->`) ni contenir `--`.
 */

const OUVRANT = 'bib:'
const FERMANT = '/bib'

/** Commentaire hast ouvrant pour la directive `nom` */
export function marqueurOuvrant(nom, attributs = {}) {
  const json = JSON.stringify({ nom, attributs })
  return { type: 'comment', value: OUVRANT + Buffer.from(json, 'utf8').toString('base64') }
}

export function marqueurFermant() {
  return { type: 'comment', value: FERMANT }
}

const MOTIF = /<!--bib:([A-Za-z0-9+/=]+)-->|<!--\/bib-->/g

/**
 * Arbre des directives d'un HTML rendu : une liste de chaînes (HTML ordinaire)
 * et de nœuds `{ nom, attributs, enfants }`.
 */
export function lireMarqueurs(html) {
  const racine = { nom: '', attributs: {}, enfants: [] }
  const pile = [racine]
  let position = 0
  for (const trouve of html.matchAll(MOTIF)) {
    const courant = pile[pile.length - 1]
    if (trouve.index > position) courant.enfants.push(html.slice(position, trouve.index))
    position = trouve.index + trouve[0].length
    if (trouve[1]) {
      const { nom, attributs } = JSON.parse(Buffer.from(trouve[1], 'base64').toString('utf8'))
      const noeud = { nom, attributs, enfants: [] }
      courant.enfants.push(noeud)
      pile.push(noeud)
    } else if (pile.length > 1) {
      pile.pop()
    }
  }
  if (position < html.length) pile[pile.length - 1].enfants.push(html.slice(position))
  if (pile.length > 1) throw new Error(`Directive « ${pile[pile.length - 1].nom} » non fermée dans le HTML rendu.`)
  return racine.enfants
}

/** Vrai si le HTML contient au moins une directive */
export function contientMarqueurs(html) {
  return html.includes('<!--bib:')
}
