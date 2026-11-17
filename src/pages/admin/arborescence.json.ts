import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { toutesLesPages, urlDePage, urlDeNouvelle } from '@/lib/contenu'
import { dossiersDePages } from './_arborescence'
import { referencesDesPages } from './_references'

/*
 * Données de l'interface de rédaction (/admin/arborescence.json), lues par
 * public/admin/index.html :
 * - dossiers : libellé complet de chaque dossier, en titre de la liste du
 *   dossier ouvert (« Pages › À propos ») ;
 * - ids : identifiants de toutes les pages (texte, .mdx et vitrines), pour
 *   refuser une création qui reprendrait l'adresse d'une page existante.
 *   Decap écrirait par-dessus le fichier du même nom sans prévenir ;
 * - apercus : adresse sur le site de chaque fiche de l'éditeur ;
 * - pages et liens : arbre des pages avec leur ordre dans le menu de section
 *   (secondaryNav.order, liens secondaryNav.links des pages de section),
 *   pour la liste des pages et le menu de gauche (public/admin/ordre-pages.js).
 *   Chaque page porte ses liens entrants (`references`, voir _references.ts),
 *   vérifiés avant une suppression.
 *
 * Générée au build, comme config.yml : une page créée en ligne y entre au
 * build suivant (quelques minutes).
 */

export const prerender = true

export const GET: APIRoute = async () => {
  const pages = await toutesLesPages()
  const fichierDe = new Map(pages.map((page) => [page.id, (page.filePath ?? '').replace(/^\.\//, '')]))
  const references = referencesDesPages(fichierDe.keys(), fichierDe)
  // Titre d'un fichier de page, pour nommer les liens entrants
  const titreDe = new Map(pages.map((page) => [fichierDe.get(page.id), page.data.title ?? page.id]))
  const donnees = {
    dossiers: dossiersDePages(pages).map(({ chemin, libelle }) => ({ chemin, libelle })),
    ids: pages.map((page) => page.id).sort(),
    // Adresse sur le site de chaque fiche de l'éditeur (« Voir la page »,
    // public/admin/apercu.js) : pages, vitrines et nouvelles
    apercus: Object.fromEntries([
      ...pages.flatMap((page) => {
        const fichier = (page.filePath ?? '').replace(/^\.\//, '')
        const relatif = fichier.replace(/^src\/content\/pages\//, '').replace(/\.(mdx?|yaml)$/, '')
        if (fichier.endsWith('.md')) return [[`#/collections/pages/entries/${relatif.split('/').map(encodeURIComponent).join('/')}`, urlDePage(page)]]
        if (fichier.endsWith('.yaml')) return [[`#/collections/vitrines/entries/${encodeURIComponent(page.id.replaceAll('/', '--'))}`, urlDePage(page)]]
        return []
      }),
      ...(await getCollection('nouvelles')).map((nouvelle) => {
        const relatif = (nouvelle.filePath ?? '').replace(/^(\.\/)?src\/content\/nouvelles\//, '').replace(/\.mdx?$/, '')
        return [`#/collections/nouvelles/entries/${relatif.split('/').map(encodeURIComponent).join('/')}`, urlDeNouvelle(nouvelle)]
      }),
    ]),
    // Hors démonstrations (/dev/) et accueil. `entree` : adresse de la page
    // dans Decap (les .mdx ne s'y modifient pas)
    pages: pages
      .filter((page) => page.id !== 'index' && !page.id.startsWith('dev/'))
      .map((page) => {
        const fichier = (page.filePath ?? '').replace(/^\.\//, '')
        const format = fichier.endsWith('.yaml') ? 'yaml' : fichier.endsWith('.mdx') ? 'mdx' : 'md'
        const relatif = fichier.replace(/^src\/content\/pages\//, '').replace(/\.(mdx?|yaml)$/, '')
        return {
          id: page.id,
          fichier,
          format,
          titre: page.data.secondaryNav?.title ?? page.data.title ?? page.id,
          ordre: page.data.secondaryNav?.order ?? null,
          // Absente du menu de section : masquée, ou sans titre (voir navigationDeSection)
          masquee: Boolean(page.data.secondaryNav?.hidden) || !(page.data.title || page.data.secondaryNav?.title),
          entree:
            format === 'md'
              ? `#/collections/pages/entries/${relatif.split('/').map(encodeURIComponent).join('/')}`
              : format === 'yaml'
                ? `#/collections/vitrines/entries/${encodeURIComponent(page.id.replaceAll('/', '--'))}`
                : null,
          references: (references.get(page.id) ?? []).map((r) => ({ ...r, titre: titreDe.get(r.fichier) ?? null })),
        }
      }),
    liens: pages.flatMap((page) =>
      (page.data.secondaryNav?.links ?? []).map((lien, index) => ({
        page: page.id,
        index,
        titre: lien.title,
        url: lien.url,
        ordre: lien.order ?? null,
      })),
    ),
  }
  return new Response(JSON.stringify(donnees) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
