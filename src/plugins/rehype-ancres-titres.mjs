import GithubSlugger from 'github-slugger'
import { ID_ICONE_ANCRE, idDeTitre, nomLienAncre } from '../lib/ancres.ts'

/*
 * Identifiants et liens d'ancre des titres h2 à h6, comme
 * gatsby-remark-autolink-headers dans coquille-web (removeAccents: true,
 * maintainCase: false) : les liens existants vers /page/#section restent
 * valides, y compris les formes à double tiret (#soutien-aux-revues--diamant-).
 *
 * Les h5 et h6 en reçoivent aussi (la source s'arrêtait à h4) : sinon Astro
 * leur donnerait un id accentué (#équipement-dassistance), différent de celui
 * des autres titres et de celui que la conversion avait posé à la main.
 *
 * Différence voulue : le lien d'ancre porte un nom accessible (« Lien vers la
 * section … ») au lieu d'une icône muette, et il est placé après le texte du
 * titre pour ne pas être lu en premier.
 *
 * L'icône et le calcul de l'identifiant viennent de src/lib/ancres.ts, comme
 * pour les titres de vitrine (Titre.astro). Chemin relatif : la config
 * d'Astro charge ce plugin hors de l'alias @/.
 */

const TITRES = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

function texteDe(noeud) {
  if (noeud.type === 'text') return noeud.value
  if (noeud.type === 'mdxTextExpression' || noeud.type === 'mdxFlowExpression') return ''
  return (noeud.children ?? []).map(texteDe).join('')
}

function parcourir(noeud, visite) {
  visite(noeud)
  for (const enfant of noeud.children ?? []) parcourir(enfant, visite)
}

export default function rehypeAncresTitres() {
  return (arbre) => {
    const slugger = new GithubSlugger()
    parcourir(arbre, (noeud) => {
      if (noeud.type !== 'element' || !TITRES.has(noeud.tagName)) return
      const texte = texteDe(noeud).trim()
      if (!texte) return
      noeud.properties ??= {}
      // Un id posé à la main dans le contenu est gardé tel quel
      const id = noeud.properties.id ?? idDeTitre(texte, slugger)
      noeud.properties.id = id
      noeud.properties.className = [...(noeud.properties.className ?? []), 'titre-ancre']
      noeud.children.push({
        type: 'element',
        tagName: 'a',
        properties: { href: `#${id}`, className: ['ancre-titre'] },
        children: [
          { type: 'element', tagName: 'span', properties: { className: ['visuellement-masque'] }, children: [{ type: 'text', value: nomLienAncre(texte) }] },
          {
            type: 'element',
            tagName: 'svg',
            // Dessin dans la planche d'icônes de la page (src/lib/sprite.ts)
            properties: { 'aria-hidden': 'true', focusable: 'false', width: '1em', height: '1em', fill: 'currentColor' },
            children: [{ type: 'element', tagName: 'use', properties: { href: `#${ID_ICONE_ANCRE}` }, children: [] }],
          },
        ],
      })
    })
  }
}
