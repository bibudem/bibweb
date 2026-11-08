/*
 * Vérification de toutes les pages du contenu sur le serveur de développement.
 *
 * Usage : node scripts/verifier-pages.mjs [--base=http://localhost:4321]
 *                                         [--ids=fichier.json] [--seulement=motif]
 *
 * Pour chaque page de src/content/pages (hors dev/), qu'elle soit en texte
 * (.md, .mdx) ou en vitrine (.yaml), et chaque nouvelle :
 * - statut 200 et présence de `<footer` : une page MDX qui plante au rendu
 *   (ReferenceError d'un composant global utilisé comme valeur) répond quand
 *   même 200, mais son HTML s'arrête juste après <main> ; le pied de page
 *   manquant est le seul signe fiable ;
 * - exactement un h1 et aucun niveau de titre sauté (WCAG 1.3.1) ;
 * - aucun « [object Object] » (JSX passé en prop d’un composant) ;
 * - aucun débordement horizontal à 390 px (téléphone) ni à 1440 px.
 *
 * --ids enregistre les identifiants des titres de chaque page : en comparant
 * deux exécutions, on s'assure que les ancres publiques n'ont pas changé.
 *
 * On ne lance ni build ni serveur : plusieurs agents partagent le serveur
 * de développement (voir docs/CONVENTIONS.md).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import slugify from '@sindresorhus/slugify'
import { idDePage, urlDeId } from '../src/lib/id-de-page.mjs'
// playwright-core (dépendance de développement) : pilote le Chrome installé,
// sans télécharger de navigateur
import { chromium } from 'playwright-core'

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const BASE = args.base ?? 'http://localhost:4321'
const RACINE = fileURLToPath(new URL('..', import.meta.url))
const LARGEURS = [390, 1440]
// Peu de pages en parallèle : le serveur de dev compile chaque page au
// premier accès et d'autres agents s'en servent en même temps.
const PARALLELE = 3

function fichiersContenu(dossier, extensions = /\.(mdx?|yaml)$/) {
  return readdirSync(dossier, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && extensions.test(f.name))
    .map((f) => join(f.parentPath, f.name))
}

// Mêmes règles que src/content.config.ts (src/lib/id-de-page.mjs)
function urlDePage(fichier) {
  return urlDeId(idDePage(relative(join(RACINE, 'src/content/pages'), fichier)))
}

// Les nouvelles prennent le `slug:` du frontmatter (casse conservée), sinon
// le nom de fichier passé dans slugify.
function urlDeNouvelle(fichier) {
  const segments = relative(join(RACINE, 'src/content/nouvelles'), fichier).replace(/\.mdx?$/, '').split('/')
  const nom = segments.pop()
  const slug = readFileSync(fichier, 'utf8').match(/^slug:\s*['"]?([^'"\n]+?)['"]?\s*$/m)?.[1] ?? slugify(nom)
  return `/nouvelles/${[...segments, slug].join('/')}/`
}

const urls = [
  ...fichiersContenu(join(RACINE, 'src/content/pages'))
    .filter((f) => !relative(join(RACINE, 'src/content/pages'), f).startsWith('dev/'))
    .map(urlDePage),
  ...fichiersContenu(join(RACINE, 'src/content/nouvelles'), /\.mdx?$/).map(urlDeNouvelle),
]
  .filter((url) => !args.seulement || url.includes(args.seulement))
  .sort()

const navigateur = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const contexte = await navigateur.newContext()
const problemes = []
const ids = {}

async function verifier(url) {
  const page = await contexte.newPage()
  const erreurs = []
  try {
    await page.setViewportSize({ width: LARGEURS[0], height: 900 })
    // HTML brut du serveur (avant tout script), lu à part : le corps de la
    // réponse du navigateur peut disparaître si Vite recharge la page.
    const reponse = await fetch(BASE + url)
    const html = await reponse.text()
    if (reponse.status !== 200) erreurs.push(`statut ${reponse.status}`)
    await page.goto(BASE + url, { waitUntil: 'load', timeout: 120_000 })
    if (!html.includes('<footer')) erreurs.push('pas de <footer (rendu interrompu ?)')
    if (html.includes('[object Object]')) erreurs.push('« [object Object] » dans le HTML')

    // Titres dans l'ordre du document, y compris ceux des panneaux masqués :
    // un lecteur d'écran les rencontre quand ils s'ouvrent.
    // querySelectorAll et non $$eval : les sélecteurs de Playwright percent
    // le shadow DOM et compteraient les titres de la barre d'outils d'Astro.
    const titres = await page.evaluate(() =>
      [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => ({ niveau: Number(el.tagName[1]), id: el.id, texte: el.textContent.replace(/Lien vers la section.*$/s, '').trim().slice(0, 50) })),
    )
    const nbH1 = titres.filter((t) => t.niveau === 1).length
    if (nbH1 !== 1) erreurs.push(`${nbH1} h1`)
    let precedent = 0
    for (const titre of titres) {
      if (titre.niveau > precedent + 1) erreurs.push(`saut h${precedent} → h${titre.niveau} (« ${titre.texte} »)`)
      precedent = titre.niveau
    }
    ids[url] = titres.filter((t) => t.id).map((t) => t.id)

    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: 900 })
      const surplus = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (surplus > 0) erreurs.push(`débordement de ${surplus} px à ${largeur} px`)
    }
  } catch (erreur) {
    erreurs.push(`erreur : ${erreur.message.split('\n')[0]}`)
  } finally {
    await page.close()
  }
  if (erreurs.length) problemes.push({ url, erreurs })
  process.stdout.write(erreurs.length ? 'x' : '.')
}

const file = [...urls]
await Promise.all(
  Array.from({ length: PARALLELE }, async () => {
    while (file.length) await verifier(file.shift())
  }),
)
await navigateur.close()

console.log(`\n${urls.length} pages vérifiées, ${problemes.length} avec des problèmes.`)
for (const { url, erreurs } of problemes.sort((a, b) => a.url.localeCompare(b.url))) {
  console.log(`\n${url}`)
  for (const erreur of erreurs) console.log(`  - ${erreur}`)
}
if (args.ids) writeFileSync(args.ids, JSON.stringify(ids, null, 2))
process.exitCode = problemes.length ? 1 : 0
