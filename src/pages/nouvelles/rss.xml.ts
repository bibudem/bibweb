import type { APIRoute } from 'astro'
import { toutesLesActualites, TYPE_PRESSE } from '@/components/contenu/dynamiques/actualites'
import { SUJETS } from '@/data/sujets'
import { avecBase } from '@/lib/chemin'
import { toutesLesNouvelles, urlDeNouvelle } from '@/lib/contenu'
import { extrait } from '@/lib/extrait'

/*
 * Fil RSS 2.0 des nouvelles (/nouvelles/rss.xml) : les mêmes éléments que la
 * page /nouvelles/, de la plus récente à la plus ancienne. Les nouvelles des
 * Bibliothèques mènent à leur page, avec un extrait du texte ; celles de la
 * revue de presse mènent à l'article du média, avec sa source.
 *
 * Écrit à la main (comme robots.txt) : quelques balises, pas de dépendance.
 * Les sujets (src/data/sujets.ts) deviennent des <category>.
 */

const TITRE = 'Nouvelles des Bibliothèques de l’Université de Montréal'
const DESCRIPTION = 'Nouvelles des Bibliothèques de l’Université de Montréal et revue de presse.'

const echapper = (texte: string) => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const libelleSujet = new Map<string, string>(SUJETS.map((s) => [s.id, s.libelle]))

export const GET: APIRoute = async ({ site }) => {
  const racine = site ?? new URL('https://bib.umontreal.ca')
  const absolue = (url: string) => new URL(avecBase(url), racine).href
  const corps = new Map((await toutesLesNouvelles()).map((n) => [urlDeNouvelle(n), n]))
  const actualites = await toutesLesActualites()

  const elements = actualites.map((a) => {
    const lien = a.externe ? a.url : absolue(a.url)
    const nouvelle = corps.get(a.url)
    const description = a.type === TYPE_PRESSE ? `Revue de presse${a.source ? ` : ${a.source}` : ''}` : extrait(nouvelle?.body, a.title, 300, nouvelle?.filePath?.endsWith('.md'))
    return [
      '    <item>',
      `      <title>${echapper(a.title)}</title>`,
      `      <link>${echapper(lien)}</link>`,
      `      <guid isPermaLink="true">${echapper(lien)}</guid>`,
      `      <pubDate>${new Date(a.timestamp).toUTCString()}</pubDate>`,
      description ? `      <description>${echapper(description)}</description>` : '',
      ...a.sujets.map((s) => `      <category>${echapper(libelleSujet.get(s) ?? s)}</category>`),
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${echapper(TITRE)}</title>`,
    `    <link>${absolue('/nouvelles/')}</link>`,
    `    <atom:link href="${absolue('/nouvelles/rss.xml')}" rel="self" type="application/rss+xml" />`,
    `    <description>${echapper(DESCRIPTION)}</description>`,
    '    <language>fr-CA</language>',
    actualites.length ? `    <lastBuildDate>${new Date(actualites[0].timestamp).toUTCString()}</lastBuildDate>` : '',
    ...elements,
    '  </channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n')

  return new Response(xml + '\n', { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
