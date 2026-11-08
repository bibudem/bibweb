// Relevé des pages de Studio·bib et de la Boîte à outils pour les
// suggestions de la recherche du menu (RechercheMenu.astro) et la page
// /resultats/. Ni l'un ni l'autre ne permet d'interroger sa recherche depuis
// un autre domaine (pas d'en-tête CORS) : on relève leurs pages ici, à la
// main, et le build les verse dans /search-index-externe.json. Les fichiers produits (src/data/recherche/) sont
// versionnés : le build ne dépend pas du réseau.
//
// Usage : npm run indexer:externes. Relancé chaque semaine par le workflow
// .github/workflows/relever-externes.yml. La date du relevé est écrite dans
// chaque fichier ; un fichier dont les pages n'ont pas changé n'est pas
// réécrit (sa date reste celle du dernier changement), pour ne pas faire de
// commit pour rien.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { decodeHTML } from 'entities'
import { couper as couperTexte, motsDistincts } from '../src/lib/texte.mjs'

const STUDIO = 'https://studio.bib.umontreal.ca'
const OUTILS = 'https://boite-outils.bib.umontreal.ca'
const DOSSIER = 'src/data/recherche'
// Requêtes simultanées vers la Boîte à outils : assez pour finir vite, assez
// peu pour ne pas charger le serveur de Springshare
const SIMULTANEES = 4
const LONGUEUR_EXTRAIT = 200

const aujourdhui = new Date().toISOString().slice(0, 10)

// Toutes les entités HTML (&ocirc;, &ndash;, &#233;…) ; l'espace insécable
// devient une espace ordinaire pour les extraits
const decoder = (texte) => decodeHTML(texte).replace(/\u00a0/g, ' ')

const texteDe = (html) =>
  decoder(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()

const couper = (texte, longueur = LONGUEUR_EXTRAIT) => couperTexte(texte, longueur)

async function lire(url, type = 'text') {
  const reponse = await fetch(url, { headers: { 'User-Agent': 'bibweb-indexer (bib.umontreal.ca)' } })
  if (!reponse.ok) throw new Error(`${url} : ${reponse.status}`)
  return reponse[type]()
}

/*
 * Studio·bib (Astro) publie son index : une entrée par page, avec `titre`,
 * `url` (relative), `description` et le `texte` de la page.
 */
async function studio() {
  const pages = await lire(`${STUDIO}/search-index.json`, 'json')
  if (!Array.isArray(pages)) throw new Error(`${STUDIO}/search-index.json : format inattendu (un tableau de pages était attendu)`)
  return pages.map((page) => ({
    title: decoder(page.titre),
    excerpt: couper(decoder(page.description || page.texte || '')),
    url: new URL(page.url, STUDIO).href,
    words: motsDistincts(decoder(page.texte ?? '')),
  }))
}

/*
 * Boîte à outils (LibGuides) : pas d'index public, mais un sitemap. On lit
 * chaque page : nom du guide et de la page (h1), description du guide,
 * texte du contenu principal.
 */
async function boiteOutils() {
  const sitemap = await lire(`${OUTILS}/sitemap.xml`)
  const urls = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, url]) => decoder(url))
  const entrees = []
  const echecs = []
  let suivante = 0
  const ouvrier = async () => {
    while (suivante < urls.length) {
      const url = urls[suivante++]
      try {
        const html = await lire(url)
        const h1 = html.match(/<h1[^>]*id="s-lg-guide-name"[^>]*>([\s\S]*?)<\/h1>/)
        if (!h1) continue
        // « Guide: Accueil » : la page d'accueil d'un guide prend le nom du guide
        const titre = texteDe(h1[1]).replace(/:\s*Accueil$/i, '')
        const description = texteDe(html.match(/id="s-lg-guide-description"[^>]*>([\s\S]*?)<\/(?:span|div)>/)?.[1] ?? '')
        const debut = html.indexOf('id="s-lg-guide-main"')
        const fin = html.indexOf('id="s-lib-footer', debut)
        const contenu = debut === -1 ? '' : texteDe(html.slice(debut, fin === -1 ? undefined : fin).replace(/^[^>]*>/, ''))
        entrees.push({ title: titre, excerpt: couper(description || contenu), url, words: motsDistincts(contenu) })
      } catch (erreur) {
        echecs.push(String(erreur.message ?? erreur))
      }
    }
  }
  await Promise.all(Array.from({ length: SIMULTANEES }, ouvrier))
  if (echecs.length) console.warn(`Boîte à outils : ${echecs.length} page(s) illisible(s)\n  ${echecs.join('\n  ')}`)
  return entrees.sort((a, b) => a.url.localeCompare(b.url))
}

mkdirSync(DOSSIER, { recursive: true })
for (const [nom, relever] of [
  ['studio', studio],
  ['boite-outils', boiteOutils],
]) {
  const entrees = await relever()
  if (!entrees.length) throw new Error(`${nom} : aucune page relevée, fichier laissé tel quel`)
  const fichier = `${DOSSIER}/${nom}.json`
  const avant = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')).entrees : null
  if (JSON.stringify(avant) === JSON.stringify(entrees)) {
    console.log(`${fichier} : ${entrees.length} pages, inchangé`)
    continue
  }
  writeFileSync(fichier, `${JSON.stringify({ releve: aujourdhui, entrees }, null, 1)}\n`)
  console.log(`${fichier} : ${entrees.length} pages`)
}
