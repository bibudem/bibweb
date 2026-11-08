/*
 * llms.txt et versions Markdown des pages (https://llmstxt.org/, v2).
 *
 * En fin de build, à partir du HTML produit (le contenu tel que publié,
 * vitrines et composants compris, et non les sources avec leurs directives) :
 *
 * - /<page>/index.md : le <main> de chaque page publiée, converti en
 *   Markdown, avec des adresses absolues. Une URL sans nom de fichier prend
 *   « index.md », comme le veut la spécification ;
 * - /llms.txt : titre du site, résumé, mode d'emploi, puis une liste de liens
 *   vers ces fichiers .md par section, les sites associés et, dans
 *   « Optional », ce qu'un agent peut sauter (nouvelles, pages légales) ;
 * - dans le <head> de chaque page qui a sa version Markdown :
 *   <link rel="alternate" type="text/markdown"> et <link rel="describedby">
 *   vers /llms.txt (découverte par les agents).
 *
 * Pages laissées de côté : applications autonomes de public/ (/ddia/,
 * /radaria/), pages sans <main>, non indexées (meta robots noindex), pages de
 * redirection, /admin/, /resultats/, /dev/ et la page 404.
 *
 * Adresses : ADRESSE_PUBLIQUE (ex. https://bibudem.github.io/bibweb, donnée
 * par deployer-pages.yml) si elle est définie, sinon `site` + `base`. Doit
 * passer après base-sous-dossier dans astro.config.mjs : les liens du HTML
 * sont alors déjà préfixés.
 */
import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'

const TITRE = "Les bibliothèques de l'Université de Montréal"

const RESUME =
  "Site Web officiel des bibliothèques de l'Université de Montréal (Montréal, Québec, Canada) : " +
  'bibliothèques et espaces d’étude, horaires, emprunt et prêt entre bibliothèques, collections, ' +
  'aide à la recherche, formations, science ouverte et services aux étudiants, au personnel enseignant et aux chercheurs.'

const DETAILS = [
  'Le site est en français. Chaque lien ci-dessous mène à la version Markdown d’une page ; la version HTML est à la même adresse sans « index.md ». Chaque fichier Markdown se termine par l’adresse de sa page HTML.',
  'Les horaires du jour, les événements et les formations sont chargés en direct depuis d’autres services : leur version Markdown peut ne pas les contenir. Pour ces informations, renvoyer vers la page HTML ou le service concerné.',
  'La recherche documentaire (livres, articles, bases de données) ne se fait pas sur ce site, mais dans Sofia et la Boîte à outils (voir « Sites associés »).',
]

/** Sections du site dans l'ordre du menu (PAGES_PRINCIPALES de src/data/navigation.ts), puis les autres ; un dossier absent de la liste suit, par ordre alphabétique */
const ORDRE_SECTIONS = ['espaces', 'etudes', 'recherche', 'enseignement', 'engagements', 'obtenir', 'nous-joindre', 'a-propos', 'nous-soutenir']

/** Pages de premier niveau sans section : avec l'accueil, en tête */
const PAGES_PRATIQUES = ['/', '/horaires/', '/personnel/', '/service-accessibilite/']

/** Pages que l'agent peut sauter (section « Optional ») */
const PAGES_SECONDAIRES = ['/accessibilite-web/', '/conditions-utilisation/']

/** Sites associés : services distincts, souvent la vraie réponse à une question */
const SITES_ASSOCIES = [
  ['Sofia', 'https://umontreal.on.worldcat.org/discovery?lang=fr', 'catalogue des collections des bibliothèques (livres, articles, revues, documents numériques)'],
  ['Mon dossier Sofia', 'https://umontreal.account.worldcat.org/account', 'prêts en cours, renouvellements, réservations'],
  ['Boîte à outils', 'https://boite-outils.bib.umontreal.ca/', 'guides de recherche par discipline, citation, droit d’auteur, IA générative'],
  ['Bases de données de A à Z', 'https://boite-outils.bib.umontreal.ca/az.php', 'bases de données et ressources électroniques par sujet'],
  ['Studio·bib', 'https://studio.bib.umontreal.ca/', 'soutien informatique, accès hors campus, technologies créatives, studios'],
  ['Réserver une salle', 'https://calendrier.bib.umontreal.ca/r', 'réservation de salles de travail en équipe'],
  ['Papyrus', 'https://umontreal.scholaris.ca/', 'dépôt institutionnel : thèses, mémoires et publications de l’UdeM'],
  ['Collections spéciales', 'https://collections-speciales.bib.umontreal.ca/', 'livres rares et objets numérisés'],
]

const EXCLUES = /^\/(admin|resultats|dev)(\/|$)/
/** Description par défaut (lib/site.ts) : n'apprend rien sur la page */
const DESCRIPTION_PAR_DEFAUT = "Site Web des Bibliothèques de l'Université de Montréal"
/** Éléments sans texte utile pour un agent (nav : fil d'Ariane, menus de section) */
const RETIRES = new Set(['nav', 'script', 'style', 'template', 'noscript', 'svg', 'button', 'form', 'input', 'select', 'textarea', 'dialog', 'iframe', 'video', 'audio'])

export default function llms() {
  let site = ''
  let base = ''
  let publicDir = ''
  return {
    name: 'llms',
    hooks: {
      'astro:config:done': ({ config }) => {
        publicDir = fileURLToPath(config.publicDir)
        site = config.site ?? 'https://bib.umontreal.ca'
        base = config.base.replace(/\/$/, '')
      },
      'astro:build:done': async ({ dir, logger }) => {
        const racine = fileURLToPath(dir)
        // Adresse publique du site, sans barre finale (inclut le sous-dossier)
        const publique = (process.env.ADRESSE_PUBLIQUE || new URL(base || '/', site).href).replace(/\/$/, '')
        const origine = new URL(publique).origin

        const pages = []
        for (const fichier of await lister(racine)) {
          if (!fichier.endsWith(`${sep}index.html`) && fichier !== join(racine, 'index.html')) continue
          const url = `/${relative(racine, fichier).split(sep).slice(0, -1).join('/')}/`.replace(/^\/\/$/, '/')
          if (EXCLUES.test(url)) continue
          // Application autonome de public/ (/ddia/, /radaria/) : pas une page du site
          if (existsSync(join(publicDir, url, 'index.html'))) continue
          const html = await readFile(fichier, 'utf8')
          const page = lirePage(html, url, publique, origine)
          if (!page) continue
          await writeFile(join(fichier, '..', 'index.md'), page.markdown)
          await writeFile(fichier, html.replace('</head>', `<link rel="alternate" type="text/markdown" href="${base}${url}index.md"><link rel="describedby" href="${base}/llms.txt"></head>`))
          pages.push(page)
        }

        await writeFile(join(racine, 'llms.txt'), llmsTxt(pages, publique))
        logger.info(`llms.txt et ${pages.length} pages en Markdown`)
      },
    },
  }
}

/* ---------- Une page ---------- */

function lirePage(html, url, publique, origine) {
  const arbre = unified().use(rehypeParse).parse(html)
  const head = trouver(arbre, (n) => n.tagName === 'head')
  const main = trouver(arbre, (n) => n.tagName === 'main')
  if (!head || !main) return null
  const meta = (cle, valeur) => trouver(head, (n) => n.tagName === 'meta' && n.properties?.[cle] === valeur)?.properties?.content
  if (/noindex/i.test(meta('name', 'robots') ?? '')) return null
  if (trouver(head, (n) => n.tagName === 'meta' && /refresh/i.test(n.properties?.httpEquiv ?? ''))) return null

  const titre = url === '/' ? 'Accueil' : String(meta('property', 'og:title') ?? texte(trouver(head, (n) => n.tagName === 'title') ?? { children: [] }))
  const brute = String(meta('name', 'description') ?? '')
  const description = brute && brute !== DESCRIPTION_PAR_DEFAUT ? brute : ''
  const adresse = `${publique}${url}`

  nettoyer(main, adresse, origine)
  const aUnH1 = Boolean(trouver(main, (n) => n.tagName === 'h1'))
  const conversion = unified()
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', emphasis: '_', rule: '-', fences: true, listItemIndent: 'one' })
  const corps = conversion
    .stringify(conversion.runSync({ type: 'root', children: [main] }))
    // Deux liens collés ([a](…)[b](…)) : une espace entre les deux
    .replace(/\)\[/g, ') [')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const entete = [aUnH1 ? '' : `# ${titre}\n\n`, description && !aUnH1 ? `> ${description}\n\n` : ''].join('')
  const markdown = `${entete}${corps}\n\n---\n\nPage HTML : ${adresse}\n`
  return { url, titre, description, adresse, markdown }
}

/** Retire ce qui n'est pas du contenu et rend les adresses absolues */
function nettoyer(noeud, adresse, origine) {
  if (!noeud.children) return
  noeud.children = noeud.children.filter((enfant) => {
    if (enfant.type === 'comment') return false
    if (enfant.type !== 'element') return true
    const p = enfant.properties ?? {}
    if (RETIRES.has(enfant.tagName)) return false
    if (p.hidden !== undefined && p.hidden !== false) return false
    if (p.ariaHidden === 'true' || p.ariaHidden === true) return false
    // Infobulles (popover), messages d'état des îlots (« 19 lieux affichés »)
    if (p.popover !== undefined || p.role === 'status') return false
    // Lien d'ancre des titres (rehype-ancres-titres)
    if (classes(p).includes('ancre-titre')) return false
    // Texte pour lecteurs d'écran (« (nouvel onglet) ») ; un titre masqué (h1 de l'accueil) reste
    if (classes(p).includes('visuellement-masque') && !/^h[1-6]$/.test(enfant.tagName)) return false
    // Image décorative (alt vide) : rien à dire
    if (enfant.tagName === 'img' && !p.alt) return false
    return true
  })
  for (const enfant of noeud.children) {
    if (enfant.type !== 'element') continue
    const p = enfant.properties
    if (enfant.tagName === 'a' && typeof p.href === 'string') p.href = absolue(p.href, adresse, origine)
    if (enfant.tagName === 'img' && typeof p.src === 'string') p.src = absolue(p.src, adresse, origine)
    nettoyer(enfant, adresse, origine)
  }
}

const classes = (p) => (Array.isArray(p.className) ? p.className : [])

function absolue(href, adresse, origine) {
  if (/^(mailto|tel):/i.test(href)) return href
  try {
    // Une adresse « /… » est déjà préfixée du sous-dossier (base-sous-dossier)
    return new URL(href, href.startsWith('/') && !href.startsWith('//') ? origine : adresse).href
  } catch {
    return href
  }
}

/* ---------- llms.txt ---------- */

function llmsTxt(pages, publique) {
  const parUrl = new Map(pages.map((p) => [p.url, p]))
  const ligne = (p) => `- [${echapper(p.titre)}](${p.adresse}index.md)${p.description ? `: ${resumer(p.description)}` : ''}`
  const blocs = [`# ${TITRE}`, `> ${RESUME}`, ...DETAILS]

  const pratiques = PAGES_PRATIQUES.map((u) => parUrl.get(u)).filter(Boolean)
  if (pratiques.length) blocs.push(`## Accueil et informations pratiques\n\n${pratiques.map(ligne).join('\n')}`)

  const sections = new Map()
  for (const page of pages) {
    const dossier = page.url.split('/')[1]
    if (!dossier || dossier === 'nouvelles' || PAGES_PRATIQUES.includes(page.url) || PAGES_SECONDAIRES.includes(page.url)) continue
    // Page de premier niveau sans sous-page ni place dans le menu : avec les secondaires
    if (!ORDRE_SECTIONS.includes(dossier) && !pages.some((p) => p !== page && p.url.startsWith(`/${dossier}/`))) continue
    if (!sections.has(dossier)) sections.set(dossier, [])
    sections.get(dossier).push(page)
  }
  const rang = (d) => (ORDRE_SECTIONS.includes(d) ? ORDRE_SECTIONS.indexOf(d) : ORDRE_SECTIONS.length)
  for (const [dossier, liste] of [...sections].sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b, 'fr'))) {
    const tete = parUrl.get(`/${dossier}/`)
    const titre = tete?.titre ?? dossier
    // La page de section d'abord, puis les autres dans l'ordre des adresses
    liste.sort((a, b) => (a === tete ? -1 : b === tete ? 1 : a.url.localeCompare(b.url, 'fr')))
    blocs.push(`## ${titre}\n\n${liste.map(ligne).join('\n')}`)
  }

  blocs.push(`## Sites associés\n\n${SITES_ASSOCIES.map(([nom, url, note]) => `- [${nom}](${url}): ${note}`).join('\n')}`)

  // Pages restées hors des sections (premier niveau, sans sous-pages)
  const classees = new Set([...pratiques, ...[...sections.values()].flat()])
  const nouvelles = pages.filter((p) => p.url.startsWith('/nouvelles/')).sort((a, b) => (a.url === '/nouvelles/' ? -1 : b.url === '/nouvelles/' ? 1 : b.url.localeCompare(a.url)))
  const secondaires = [...PAGES_SECONDAIRES.map((u) => parUrl.get(u)).filter(Boolean), ...pages.filter((p) => !classees.has(p) && !p.url.startsWith('/nouvelles/') && !PAGES_SECONDAIRES.includes(p.url)), ...nouvelles]
  if (secondaires.length) blocs.push(`## Optional\n\n${secondaires.map(ligne).join('\n')}\n- [Fil RSS des nouvelles](${publique}/nouvelles/rss.xml)`)

  return `${blocs.join('\n\n')}\n`
}

/** Une description tronquée (« … ») ou longue est coupée à la fin d'une phrase ou d'un mot */
function resumer(texte, max = 200) {
  const propre = texte.replace(/\s+/g, ' ').trim()
  if (propre.length <= max && !propre.endsWith('…')) return propre
  const coupe = propre.replace(/…$/, '').slice(0, max)
  const phrase = coupe.match(/^.*[.!?](?=\s|$)/)?.[0]
  return phrase && phrase.length > max / 2 ? phrase : `${coupe.replace(/\s+\S*$/, '')}…`
}

const echapper = (texte) => texte.replace(/([[\]])/g, '\\$1')

/* ---------- Outils ---------- */

function trouver(noeud, test) {
  if (noeud.type === 'element' && test(noeud)) return noeud
  for (const enfant of noeud.children ?? []) {
    const trouve = trouver(enfant, test)
    if (trouve) return trouve
  }
  return null
}

function texte(noeud) {
  return noeud.type === 'text' ? noeud.value : (noeud.children ?? []).map(texte).join('')
}

async function lister(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true })
  const fichiers = await Promise.all(entrees.map((e) => (e.isDirectory() ? lister(join(dossier, e.name)) : [join(dossier, e.name)])))
  return fichiers.flat()
}
