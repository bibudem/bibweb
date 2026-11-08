/*
 * Extrait texte d'un corps MDX brut, pour l'index de recherche interne.
 *
 * La source (makeExcerpt de coquille-web) traitait le MDX ligne par ligne
 * avec des expressions régulières : des restes de props passaient dans
 * l'index (« Image= imageWidth= imageHeight= », « small small small »), et les
 * pages faites seulement de composants (À propos) n'avaient aucun extrait.
 * On analyse plutôt le MDX en arbre (sans le compiler, ce qui reste rapide) :
 * on garde le texte des nœuds et les props textuelles des composants qui
 * portent du contenu lisible (title, description…), et on écarte imports,
 * exports, expressions JS et autres attributs.
 */
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxFromMarkdown } from 'mdast-util-mdx'
import { mdxjs } from 'micromark-extension-mdxjs'
import { couper } from './texte.mjs'

// Props dont la valeur est du texte destiné au lecteur
const PROPS_TEXTE = new Set(['title', 'subtitle', 'description', 'texte', 'text', 'label', 'question', 'reponse'])

// Nœuds sans texte lisible
const NOEUDS_IGNORES = new Set(['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'code', 'html', 'image', 'imageReference', 'definition'])

// Nœuds de bloc : on les sépare d'une espace (un titre puis un paragraphe)
const BLOCS = new Set(['paragraph', 'heading', 'listItem', 'tableCell', 'mdxJsxFlowElement', 'blockquote'])

type Noeud = {
  type: string
  value?: string
  children?: Noeud[]
  attributes?: { type: string; name?: string; value?: unknown }[]
}

// Texte brut d'un nœud (sans code, HTML ni expressions JS)
const texteBrut = (noeud: Noeud): string => (NOEUDS_IGNORES.has(noeud.type) ? '' : (noeud.value ?? (noeud.children ?? []).map(texteBrut).join('')))

// Le titre de la page, souvent répété par BanniereAccueil ou un premier titre
// (markdown ou Typographie),
// gaspillerait le début de l'extrait : on l'écarte quand il forme un bloc
// entier (et seulement alors, pour ne pas couper « Obtenir un document »).
function collecter(noeud: Noeud, morceaux: string[], titre: string) {
  if (NOEUDS_IGNORES.has(noeud.type)) return
  if (BLOCS.has(noeud.type) && titre && texteBrut(noeud).trim() === titre) return
  if (noeud.type === 'text' || noeud.type === 'inlineCode') {
    morceaux.push(noeud.value ?? '')
    return
  }
  if (noeud.type === 'mdxJsxFlowElement' || noeud.type === 'mdxJsxTextElement') {
    for (const attribut of noeud.attributes ?? []) {
      if (attribut.type === 'mdxJsxAttribute' && PROPS_TEXTE.has(attribut.name ?? '') && typeof attribut.value === 'string' && attribut.value.trim() !== titre) {
        morceaux.push(` ${attribut.value} `)
      }
    }
  }
  for (const enfant of noeud.children ?? []) collecter(enfant, morceaux, titre)
  if (BLOCS.has(noeud.type)) morceaux.push(' ')
}

/*
 * Markdown pur (.md) : on ne l'analyse pas en MDX (un <br> ou des accolades
 * y seraient des erreurs). Ses directives sont ramenées à leur texte : les
 * lignes :::nom et ::: disparaissent, ::bouton[Texte]{…} donne « Texte »,
 * les icônes :icone[nom] et les directives sans texte (:nombre-liens, rempli
 * au rendu) sont retirées. Un « : » suivi d'une espace (typographie
 * française) ou d'une barre (https://) n'est pas une directive.
 */
function sansDirectives(corps: string) {
  return corps
    .replace(/^\s*:{3,}.*$/gm, '')
    .replace(/:icone\[[^\]]*\](\{[^}]*\})?/g, '')
    .replace(/:{1,2}[a-z][\w-]*\[([^\]]*)\](\{[^}]*\})?/g, '$1')
    .replace(/(^|\s):{1,2}[a-z][\w-]*(\{[^}]*\})?(?=[\s.,;!?)]|$)/gm, '$1')
}

// Arbre mdast d'un corps .md (directives ramenées à leur texte) ou MDX
const arbreDe = (corps: string, markdown: boolean) =>
  (markdown ? fromMarkdown(sansDirectives(corps)) : fromMarkdown(corps, { extensions: [mdxjs()], mdastExtensions: [mdxFromMarkdown()] })) as unknown as Noeud

function texteDu(corps: string, titre: string, markdown: boolean) {
  try {
    const arbre = arbreDe(corps, markdown)
    const morceaux: string[] = []
    collecter(arbre, morceaux, titre)
    return morceaux.join('')
  } catch {
    // MDX que l'analyseur refuse (ne devrait pas arriver : Astro l'a compilé) :
    // on se rabat sur le texte débarrassé des balises et des expressions.
    return corps.replace(/<[^>]*>|\{[^{}]*\}/g, ' ')
  }
}

/** `markdown` : corps d'une page .md (sinon, du MDX) */
export function extrait(corps: string | undefined, titre?: string, longueur = 200, markdown = false) {
  if (!corps) return ''

  return couper(texteDu(corps, titre?.trim() ?? '', markdown).replace(/\s+/g, ' ').trim(), longueur)
}

// Champs des vitrines qui portent du texte destiné au lecteur ; pour une
// description, sans les titres ni les appels
const CHAMPS_TEXTE = new Set(['titre', 'texte', 'appel', 'description'])
const CHAMPS_DESCRIPTION = new Set(['texte', 'description'])

// Valeurs des champs `cles` d'une vitrine, à toute profondeur, dans l'ordre de la page
function textesDe(valeur: unknown, morceaux: string[], cles: Set<string> = CHAMPS_TEXTE) {
  if (Array.isArray(valeur)) valeur.forEach((v) => textesDe(v, morceaux, cles))
  else if (valeur && typeof valeur === 'object') {
    for (const [cle, v] of Object.entries(valeur)) {
      if (typeof v === 'string' && cles.has(cle)) morceaux.push(v)
      else if (typeof v === 'object') textesDe(v, morceaux, cles)
    }
  }
}

/** Extrait d'une vitrine : textes de sa bannière et de ses sections, dans l'ordre de la page */
export function extraitVitrine(sections: unknown[], titre?: string, longueur = 200) {
  const morceaux: string[] = []
  textesDe(sections, morceaux)
  return extrait(morceaux.join('\n\n'), titre, longueur, true)
}

/*
 * Description automatique (balise meta, partage), pour une page sans
 * `description` : les premiers paragraphes de la page, sans ses titres ni ses
 * listes (l'extrait de la recherche les recolle : « Curiosité illimitée Quoi
 * de neuf Espaces Tout le monde… »). Un paragraphe qui annonce une liste
 * est sauté : celui qui finit par « : » (« Dans cette page : ») et celui
 * qu'une liste suit directement sans qu'il finisse une phrase
 * (« Considérant que »).
 */

/** Longueur d'une description automatique : au-delà, Google la coupe */
const LONGUEUR_DESCRIPTION = 155

function paragraphes(noeud: Noeud, sortie: string[]) {
  if (NOEUDS_IGNORES.has(noeud.type) || noeud.type === 'heading' || noeud.type === 'list' || noeud.type === 'table') return
  if (noeud.type === 'paragraph') {
    const texte = texteBrut(noeud).replace(/\s+/g, ' ').trim()
    if (texte && !texte.endsWith(':')) sortie.push(texte)
    return
  }
  const enfants = noeud.children ?? []
  enfants.forEach((enfant, i) => {
    if (enfant.type === 'paragraph' && enfants[i + 1]?.type === 'list' && !/[.!?…]$/.test(texteBrut(enfant).trim())) return
    paragraphes(enfant, sortie)
  })
}

/** Assemble des paragraphes jusqu'à une description d'une centaine de caractères au moins */
function assembler(morceaux: string[]) {
  let texte = ''
  for (const morceau of morceaux) {
    texte = texte ? `${texte} ${morceau}` : morceau
    if (texte.length >= 100) break
  }
  return couper(texte, LONGUEUR_DESCRIPTION)
}

export function descriptionAuto(corps: string | undefined, titre?: string, markdown = false) {
  if (!corps) return ''
  try {
    const morceaux: string[] = []
    paragraphes(arbreDe(corps, markdown), morceaux)
    return assembler(morceaux) || extrait(corps, titre, LONGUEUR_DESCRIPTION, markdown)
  } catch {
    return extrait(corps, titre, LONGUEUR_DESCRIPTION, markdown)
  }
}

/** Vitrine : le sous-titre de la bannière, sinon les textes de ses blocs (sans leurs titres). Avec la
    recherche Sofia (accueil), le sous-titre est la légende de la photo : on ne le prend pas. */
export function descriptionVitrine(banniere: { sousTitre?: string[]; rechercheSofia?: boolean } | undefined, sections: unknown[]) {
  if (banniere?.sousTitre?.length && !banniere.rechercheSofia) return couper(banniere.sousTitre.join(' '), LONGUEUR_DESCRIPTION)
  const textes: string[] = []
  textesDe(sections, textes, CHAMPS_DESCRIPTION)
  return descriptionAuto(textes.join('\n\n'), undefined, true)
}
