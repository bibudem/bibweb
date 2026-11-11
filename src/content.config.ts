import { defineCollection } from 'astro:content'
import { glob, file } from 'astro/loaders'
import { z } from 'astro/zod'
import slugify from '@sindresorhus/slugify'
import { idDePage } from './lib/id-de-page.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { schemaVitrine } from '@/lib/schema-vitrines'
import { IDS_SUJETS } from '@/data/sujets'

/*
 * Collections de contenu.
 *
 * Les identifiants reproduisent les URL de coquille-web (gatsby-node.mjs),
 * pour que toutes les adresses actuelles restent valides :
 * - pages : `<dossier>/<slugify(nom de fichier)>`, `index` donne le dossier.
 *   Le `slug:` du frontmatter est ignoré, comme dans Gatsby où il ne
 *   s'appliquait jamais aux pages (un bogue heureux : l'appliquer aurait
 *   changé des URL publiques, par exemple /a-propos/carriere/carriere/).
 * - nouvelles : `<année>/<slug du frontmatter, casse conservée>`, ou le nom
 *   de fichier passé dans slugify s'il n'y a pas de slug.
 *
 * Deux types de pages partagent l'arborescence src/content/pages (voir
 * docs/CONVENTIONS.md) : les pages de texte (.md, ou .mdx pendant la
 * transition), collection `pages`, et les vitrines (.yaml), collection
 * `vitrines`. Une URL n'a qu'une source : deux fichiers qui donnent le même
 * identifiant (diplomes.md et diplomes.mdx, recherche/index.mdx et
 * recherche/index.yaml) font échouer le build.
 */

const BASE_PAGES = './src/content/pages'

// Identifiant d'une page d'après son chemin : src/lib/id-de-page.mjs (partagé
// avec le plan du site et scripts/verifier-pages.mjs)

// Fichier source de chaque identifiant de page, toutes collections
// confondues. Le chargeur rappelle generateId à chaque modification : on ne
// signale un doublon que si l'autre fichier existe encore (sinon, c'est un
// renommage, par exemple de .mdx en .md).
const sourcesParId = new Map<string, string>()

function idUnique(entry: string) {
  const id = idDePage(entry)
  const autre = sourcesParId.get(id)
  if (autre && autre !== entry && existsSync(join(BASE_PAGES, autre))) {
    throw new Error(
      `Deux fichiers donnent la même page /${id === 'index' ? '' : `${id}/`} : src/content/pages/${autre} et src/content/pages/${entry}. ` +
        'Une page existe en un seul exemplaire : texte (.md ou .mdx) ou vitrine (.yaml). Supprimez l’un des deux.',
    )
  }
  sourcesParId.set(id, entry)
  return id
}

const secondaryNav = z
  .object({
    title: z.string().optional(),
    order: z.number().optional(),
    hidden: z.boolean().optional(),
    /** Page de section : liens du menu de gauche vers des pages rangées ailleurs (/horaires/…) */
    links: z
      .array(
        z
          .object({
            title: z.string().min(1),
            url: z.string().regex(/^(\/|https?:\/\/)/, 'Une adresse commence par / ou par https://'),
            order: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .optional()

const superHero = z
  .object({
    imageName: z.string(),
    title: z.string().optional(),
    // Hauteur de la photo gardée au recadrage (« 20% ») ; voir lib/bannieres.ts
    cadrage: z.string().regex(/^(100|[1-9]?\d)%$/).optional(),
  })
  .optional()

// Langue du contenu de la page (BCP 47, ex. `en`) ; absente = français.
// Le gabarit la met sur <html> ; la coquille reste en français.
const lang = z
  .string()
  .trim()
  .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'Code de langue BCP 47 attendu (ex. en, en-CA)')
  .optional()

const pages = defineCollection({
  loader: glob({
    base: BASE_PAGES,
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => idUnique(entry),
  }),
  schema: z.object({
    title: z.string().trim().optional(),
    description: z.string().optional(),
    crumbLabel: z.string().trim().optional(),
    secondaryNav,
    superHero,
    noindex: z.boolean().optional(),
    /** true : pas de sommaire « Sur cette page », même avec assez de sections.
     *  Absent ou false : le sommaire suit la règle habituelle (3 sections et plus). */
    sansSommaire: z.boolean().optional(),
    lvl: z.number().optional(),
    lang,
  }),
})

// Sujets d'une nouvelle ou d'un article de presse (src/data/sujets.ts)
const sujets = z.array(z.enum(IDS_SUJETS)).default([])

const nouvelles = defineCollection({
  loader: glob({
    base: './src/content/nouvelles',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry, data }) => {
      const segments = entry.replace(/\.mdx?$/i, '').split('/')
      const nom = segments.pop() ?? ''
      const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : slugify(nom)
      return [...segments, slug].join('/')
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().trim(),
      /** Titre affiché (h1) quand il diffère du `title` (onglet, listes), comme dans la source */
      titreAffiche: z.string().trim().optional(),
      slug: z.string().optional(),
      date: z.coerce.date(),
      type: z.literal('interne').default('interne'),
      source: z.string().optional(),
      newsUrl: z.string().url().optional(),
      authors: z.array(z.string()).optional(),
      crumbLabel: z.string().optional(),
      newsImage: z
        .object({
          src: image().optional(),
          alt: z.string().nullish(),
          legend: z.string().nullish(),
          caption: z.string().nullish(),
          source: z.string().nullish(),
        })
        .optional(),
      sujets,
    }),
})

// Revue de presse : un seul fichier JSON que l'équipe édite à la main
const revueDePresse = defineCollection({
  loader: file('src/content/revue-de-presse/articles.json', {
    parser: (texte) => JSON.parse(texte).map((article: { url: string }) => ({ id: article.url, ...article })),
  }),
  schema: z.object({
    title: z.string().trim(),
    date: z.coerce.date(),
    source: z.string().trim(),
    url: z.string().url(),
    lang: z.string().default('fr'),
    sujets,
  }),
})

// Vitrines : pages d'accueil et de section en données YAML, rendues par
// src/layouts/GabaritVitrine.astro (schéma des blocs : lib/schema-vitrines.ts)
const vitrines = defineCollection({
  loader: glob({
    base: BASE_PAGES,
    pattern: '**/*.yaml',
    generateId: ({ entry }) => idUnique(entry),
  }),
  schema: ({ image }) => schemaVitrine(image, { secondaryNav, lang }),
})

export const collections = { pages, vitrines, nouvelles, revueDePresse }
