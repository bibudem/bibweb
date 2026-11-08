/*
 * Markdown d'un champ de données (texte d'une vitrine) vers du HTML, au
 * build. Même réglage que les pages : guillemets laissés tels quels.
 * Pas de plugins de titres : un champ de texte ne contient pas de titre.
 */
import { unified, type MarkdownRenderer } from '@astrojs/markdown-remark'
import { analyserLien, annonceLien } from '@/lib/liens'

type Noeud = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: Noeud[] }

/*
 * Annonce masquée « (PDF) » sur les liens vers un PDF, comme le composant
 * Lien des pages : l'icône PDF du CSS global ne se voit qu'à l'écran.
 */
function rehypeAnnonceLiens() {
  return (arbre: Noeud) => {
    const visiter = (noeud: Noeud) => {
      if (noeud.type === 'element' && noeud.tagName === 'a') {
        const annonce = annonceLien({ pdf: analyserLien(String(noeud.properties?.href ?? '')).pdf, nouvelOnglet: false })
        if (annonce) {
          noeud.children = [
            ...(noeud.children ?? []),
            { type: 'element', tagName: 'span', properties: { className: ['visuellement-masque'] }, children: [{ type: 'text', value: annonce } as Noeud] },
          ]
        }
      }
      noeud.children?.forEach(visiter)
    }
    visiter(arbre)
  }
}

/*
 * Le HTML brut éventuel (nœuds `raw`) est retiré : le schéma des vitrines le
 * refuse déjà, c'est une seconde barrière pour tout autre appelant.
 */
function rehypeSansHtmlBrut() {
  return (arbre: Noeud) => {
    const visiter = (noeud: Noeud) => {
      if (noeud.children) noeud.children = noeud.children.filter((enfant) => enfant.type !== 'raw')
      noeud.children?.forEach(visiter)
    }
    visiter(arbre)
  }
}

let rendu: Promise<MarkdownRenderer> | undefined

export async function markdownEnHtml(texte: string): Promise<string> {
  rendu ??= unified({ smartypants: false, rehypePlugins: [rehypeSansHtmlBrut, rehypeAnnonceLiens] }).createRenderer({ syntaxHighlight: false })
  return (await (await rendu).render(texte)).code
}

/**
 * Une seule ligne de Markdown (légende, italique et liens) : sans le <p> qui
 * l'entoure. Plusieurs paragraphes sont joints en une ligne (sinon le
 * remplacement laissait des </p><p> orphelins).
 */
export async function markdownEnLigne(texte: string): Promise<string> {
  return (await markdownEnHtml(texte)).trim().replace(/<\/p>\s*<p>/g, ' ').replace(/^<p>([\s\S]*)<\/p>$/, '$1')
}
