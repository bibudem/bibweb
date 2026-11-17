import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { readFileSync } from 'node:fs'
import { toutesLesPages, estVitrine, urlDeNouvelle } from '@/lib/contenu'

/*
 * Chiffres du tableau de bord de l'interface de rédaction
 * (/admin/tableau-de-bord.json), lus par public/admin/accueil.js : pages,
 * nouvelles, revue de presse, et dernières nouvelles. Générés au
 * build : en ligne, à jour après la reconstruction du site. Les images sont
 * comptées par la médiathèque (medias.json).
 */

export const prerender = true

export const GET: APIRoute = async () => {
  const pages = (await toutesLesPages()).filter((page) => page.id !== 'index' && !page.id.startsWith('dev/'))
  const nouvelles = (await getCollection('nouvelles')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  const annee = new Date().getFullYear()
  let articles: { date?: string }[] = []
  try {
    articles = JSON.parse(readFileSync('src/content/revue-de-presse/articles.json', 'utf8')).articles ?? []
  } catch {
    articles = []
  }

  const donnees = {
    genereLe: new Date().toISOString(),
    pages: {
      total: pages.length,
      sections: pages.filter((page) => estVitrine(page) && !page.id.includes('/')).length,
      horsMenu: pages.filter((page) => page.data.secondaryNav?.hidden).length,
    },
    nouvelles: {
      total: nouvelles.length,
      annee,
      cetteAnnee: nouvelles.filter((n) => n.data.date.getFullYear() === annee).length,
      dernieres: nouvelles.slice(0, 5).map((n) => {
        const relatif = (n.filePath ?? '').replace(/^(\.\/)?src\/content\/nouvelles\//, '').replace(/\.mdx?$/, '')
        return {
          titre: n.data.title,
          date: n.data.date.toISOString().slice(0, 10),
          entree: `#/collections/nouvelles/entries/${relatif.split('/').map(encodeURIComponent).join('/')}`,
          url: urlDeNouvelle(n),
        }
      }),
    },
    articles: {
      total: articles.length,
      cetteAnnee: articles.filter((a) => String(a.date ?? '').startsWith(String(annee))).length,
    },
  }
  return new Response(JSON.stringify(donnees) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
