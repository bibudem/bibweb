// @ts-check
import { defineConfig } from 'astro/config'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { idDePage, urlDeId } from './src/lib/id-de-page.mjs'
import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import rehypeAncresTitres from './src/plugins/rehype-ancres-titres.mjs'
import rehypeTitrePrincipal from './src/plugins/rehype-titre-principal.mjs'
import remarkDirective from 'remark-directive'
import { remarkDirectivesBib, rehypeDirectivesBib } from './src/plugins/directives.mjs'
import baseSousDossier from './src/plugins/base-sous-dossier.mjs'
import llms from './src/plugins/llms.mjs'
import indexPublic from './src/plugins/index-public.mjs'

const SITE = 'https://bib.umontreal.ca'

// Environnement déduit de la branche git, comme dans coquille-web ;
// SITE_ENV peut le forcer. Sert au robots.txt (src/pages/robots.txt.ts).
function branche() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}
process.env.SITE_ENV ||= branche() === 'production' ? 'production' : 'preprod'

// Pages à garder hors du sitemap : toute page de contenu marquée `noindex`
// (relevée dans son en-tête : une nouvelle page noindex en sort d'elle-même),
// plus les pages hors collection qui le sont aussi.
function pagesNonIndexees() {
  const racine = fileURLToPath(new URL('./src/content/pages/', import.meta.url))
  return readdirSync(racine, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(mdx?|yaml)$/.test(f) && /^noindex:\s*true\s*$/m.test(readFileSync(join(racine, f), 'utf8')))
    .map((f) => urlDeId(idDePage(f.split(sep).join('/'))))
}
const HORS_SITEMAP = new Set([...pagesNonIndexees(), '/resultats/'])

// L'ordre compte : les ancres sont posées sur les niveaux d'origine (h2 à
// h4, comme dans la source), puis les titres des pages sans h1 montent
// d'un niveau en gardant leur id et leur lien d'ancre.
const rehypeTitres = [rehypeAncresTitres, rehypeTitrePrincipal]

// MDX (pages et nouvelles encore en .mdx)
const processeur = unified({
  rehypePlugins: rehypeTitres,
  // Les guillemets et apostrophes du contenu sont déjà typographiques
  smartypants: false,
})

// Pages de texte en Markdown pur (.md) : mêmes titres, plus les directives
// (:::modalites, ::bouton…, voir docs/REDACTION.md). Les directives ne
// s'appliquent pas au MDX, où un « voir:ici » doit rester du texte.
const processeurMarkdown = unified({
  remarkPlugins: [remarkDirective, remarkDirectivesBib],
  // rehypeDirectivesBib en dernier : il change les directives en marqueurs
  // que RenduDirectives.astro remplace par les composants du MDX
  rehypePlugins: [...rehypeTitres, rehypeDirectivesBib],
  smartypants: false,
})

export default defineConfig({
  site: SITE,
  // Sous-dossier de publication : seulement pour GitHub Pages (/bibweb),
  // fourni par le workflow (.github/workflows/deployer-pages.yml). Les liens
  // écrits à la racine sont préfixés en fin de build (base-sous-dossier).
  base: process.env.BASE_PATH || '/',
  // Toutes les URL de coquille-web finissent par une barre oblique
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Garde les espaces entre éléments en ligne (liens, icônes), comme en v6
  compressHTML: true,
  markdown: { processor: processeurMarkdown },
  integrations: [
    mdx({ processor: processeur }),
    // Preact en mode compat pour l'îlot des horaires : mêmes composants et
    // mêmes icônes Phosphor qu'avec React (alias react → preact/compat), pour
    // ≈ 8 Ko gzip au lieu de ≈ 69 Ko de React sur /horaires/
    preact({ compat: true }),
    sitemap({ filter: (page) => !HORS_SITEMAP.has(new URL(page).pathname) }),
    baseSousDossier(),
    // Dev : /ddia/, /engagements/science-ouverte/… servent leur index.html
    indexPublic(),
    // llms.txt et versions Markdown des pages ; après baseSousDossier (liens déjà préfixés)
    llms(),
  ],
  // Page vide dans la source : on renvoie vers la page du site qui en tient lieu
  redirects: {
    '/nous-soutenir/accessibilite-web/': '/accessibilite-web/',
  },
  vite: {
    // Imports `@/components/...` dans le contenu, au lieu de chemins relatifs
    // fragiles (../../../../components/...) ; voir aussi tsconfig.json
    resolve: { alias: { '@/': fileURLToPath(new URL('./src/', import.meta.url)) } },
    // Dépendances des îlots pré-optimisées dès le démarrage du dev :
    // découvertes au premier affichage de /horaires/, Vite les réoptimisait
    // en cours de route et servait des versions périmées (504 « Outdated
    // Optimize Dep ») ; l'îlot ne s'hydratait pas et la carte restait vide.
    // Leaflet est importé à la demande (CarteLeaflet, dans un effet). Preact
    // et ses points d'entrée compat sont ajoutés par @astrojs/preact ; les
    // icônes Phosphor des îlots sont trouvées en parcourant `entries`.
    // Même chose pour le routeur de <ClientRouter /> (Base.astro) : découvert
    // à la première page, il faisait réoptimiser Vite et casser l'îlot.
    optimizeDeps: {
      include: [
        'leaflet',
        'preact',
        'preact/hooks',
        'preact/compat',
        'preact/jsx-runtime',
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js',
        'astro/virtual-modules/transitions-types.js',
      ],
      entries: ['src/components/ilots/**/*.tsx'],
    },
    // Les icônes Phosphor importent `react` : regroupées par Vite au rendu
    // serveur plutôt que chargées telles quelles par Node, elles passent par
    // l'alias react → preact/compat (src/lib/sprite.ts les rend en chaîne
    // SVG). Sinon Node chargerait le vrai React (installé comme dépendance
    // de Phosphor) et le build échouerait. Déclaré pour l'environnement du
    // dev (ssr) et pour celui du build (prerender) : @astrojs/preact ne pose
    // pas lui-même ces entrées dès qu'une liste existe déjà.
    environments: Object.fromEntries(
      ['ssr', 'prerender'].map((nom) => [nom, { resolve: { noExternal: ['@phosphor-icons/react', 'react', 'react-dom', 'react/jsx-runtime'] } }]),
    ),
  },
  image: {
    // Mêmes largeurs que gatsby-plugin-sharp
    breakpoints: [600, 900, 1200, 1536],
  },
})
