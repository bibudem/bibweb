import { getCollection, type CollectionEntry } from 'astro:content'
import { GROUPES_DE_PAGES } from '@/data/navigation'

/*
 * Accès au contenu partagé par les gabarits et la coquille : URL, niveau de
 * page, libellés du fil d'Ariane et arbre de la navigation secondaire.
 * Tout est calculé au build ; rien n'est recalculé dans le navigateur.
 */

/** Page de texte (.md, ou .mdx pendant la transition) */
export type PageTexte = CollectionEntry<'pages'>
/** Page vitrine (.yaml) : accueil et pages de section */
export type Vitrine = CollectionEntry<'vitrines'>
/** Toute page du site, quel que soit son type ; `data` a les mêmes métadonnées */
export type Page = PageTexte | Vitrine
export type Nouvelle = CollectionEntry<'nouvelles'>

export function estVitrine(page: Page): page is Vitrine {
  return page.collection === 'vitrines'
}

/** Pages et nouvelles qui ne sont pas publiées (démos, tests) */
const EXCLUES_DE_LA_RECHERCHE = /^dev(\/|$)/
const EN_PRODUCTION = process.env.SITE_ENV === 'production'

export function urlDePage(page: Page) {
  return page.id === 'index' ? '/' : `/${page.id}/`
}

export function urlDeNouvelle(nouvelle: Nouvelle) {
  return `/nouvelles/${nouvelle.id}/`
}

/** Niveau de page : `/` = 0, `/obtenir/` = 1, `/obtenir/peb/` = 2… */
export function niveauDe(url: string) {
  return url.split('/').filter(Boolean).length
}

/** Langue du site : la coquille (en-tête, menus, pied de page) est toujours en français */
export const LANGUE_SITE = 'fr-CA'

/** Vrai si la langue est absente ou une variante du français */
export function estEnFrancais(lang?: string) {
  return !lang || /^fr(-|$)/i.test(lang)
}

/**
 * Valeur de l'attribut `lang` d'un libellé (fil d'Ariane, navigation) qui
 * reprend le titre d'une page : seulement si la page n'est pas en français,
 * pour ne pas répéter la langue héritée partout.
 */
function langDuLibelle(lang?: string) {
  return estEnFrancais(lang) ? undefined : lang
}

export function estExclueDeLaRecherche(page: Page) {
  return Boolean(page.data.noindex) || EXCLUES_DE_LA_RECHERCHE.test(page.id)
}

let cachePages: Page[] | undefined
let cacheNouvelles: Nouvelle[] | undefined

/**
 * Pages de texte et vitrines réunies. Une URL n'a qu'une source : le
 * chargeur le vérifie déjà (content.config.ts), et on le revérifie ici entre
 * les deux collections, pour que le build échoue même si un doublon lui a
 * échappé (fichier ajouté pendant que le serveur tournait).
 */
export async function toutesLesPages(): Promise<Page[]> {
  if (!cachePages) {
    const textes = await getCollection('pages')
    const vitrines = await getCollection('vitrines')
    const idsTexte = new Map(textes.map((page) => [page.id, page]))
    for (const vitrine of vitrines) {
      const texte = idsTexte.get(vitrine.id)
      if (texte) {
        throw new Error(
          `La page ${urlDePage(vitrine)} existe à la fois en texte (${texte.filePath}) et en vitrine (${vitrine.filePath}). Supprimez l’un des deux fichiers.`,
        )
      }
    }
    // Les démos des composants (/dev/) ne sont publiées qu'en préproduction
    // et en dev : le build de production (SITE_ENV=production) ne les génère pas.
    const publiees = [...textes, ...vitrines].filter((page) => !(EN_PRODUCTION && EXCLUES_DE_LA_RECHERCHE.test(page.id)))
    cachePages = publiees.sort((a, b) => a.id.localeCompare(b.id, 'fr'))
  }
  return cachePages
}

export async function toutesLesNouvelles() {
  cacheNouvelles ??= (await getCollection('nouvelles')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  return cacheNouvelles
}

/**
 * Libellés du fil d'Ariane, par chemin sans barre finale : `crumbLabel` du
 * frontmatter, sinon le titre de la page. Un segment sans page garde son
 * nom brut, comme dans coquille-web.
 */
async function libellesFilAriane() {
  const libelles = new Map<string, { libelle: string; lang?: string }>()
  for (const page of await toutesLesPages()) {
    const libelle = page.data.crumbLabel ?? page.data.title
    if (libelle) libelles.set(urlDePage(page).replace(/\/$/, '') || '/', { libelle, lang: langDuLibelle(page.data.lang) })
  }
  for (const nouvelle of await toutesLesNouvelles()) {
    libelles.set(urlDeNouvelle(nouvelle).replace(/\/$/, ''), { libelle: nouvelle.data.crumbLabel ?? nouvelle.data.title })
  }
  return libelles
}

/** Page dont l'URL est donnée (avec la barre finale), s'il y en a une */
export async function pageParUrl(url: string) {
  return (await toutesLesPages()).find((page) => urlDePage(page) === url)
}

/** `lang` : langue du libellé, seulement si elle diffère du français ; sans `url` : un groupe de pages, qui n'a pas de page à lui */
type Maillon = { url?: string; libelle: string; lang?: string }

/**
 * Fil d'Ariane d'une URL. Le maillon de l'année des nouvelles est retiré
 * (/nouvelles/2026/x/ donne Accueil › Nouvelles › x), comme dans
 * NouvelleTemplate. Une page d'un groupe (GROUPES_DE_PAGES) reçoit le nom
 * du groupe avant le sien (Accueil › À propos du site › Accessibilité web).
 */
export async function filAriane(url: string): Promise<Maillon[]> {
  const libelles = await libellesFilAriane()
  const maillons: Maillon[] = [{ url: '/', libelle: 'Accueil' }]
  const groupe = GROUPES_DE_PAGES.find((g) => g.liens.some((l) => l.href === url))
  if (groupe) maillons.push({ libelle: groupe.titre })
  let chemin = ''
  for (const segment of url.split('/').filter(Boolean)) {
    chemin += `/${segment}`
    if (/^\/nouvelles\/\d{4}$/.test(chemin)) continue
    const trouve = libelles.get(chemin)
    maillons.push({ url: `${chemin}/`, libelle: trouve?.libelle ?? segment, lang: trouve?.lang })
  }
  return maillons
}

/** Racine d'une navigation secondaire : sans `url` pour un groupe de pages ou un sommaire ; `sommaire` : c'est le sommaire « Sur cette page » d'une page */
export type RacineNavigation = Omit<NoeudNavigation, 'url' | 'ordre'> & { url?: string; sommaire?: boolean }

/** Titre du sommaire d'une page (colonne de droite et volet repliable) */
export const TITRE_SOMMAIRE = 'Sur cette page'

/**
 * Navigation du groupe (GROUPES_DE_PAGES) qui contient la page, s'il y en a
 * un. Un lien interne vers une page absente fait échouer le build plutôt que
 * de laisser un lien mort dans la navigation.
 */
export async function navigationDeGroupe(url: string): Promise<RacineNavigation | null> {
  const groupe = GROUPES_DE_PAGES.find((g) => g.liens.some((l) => l.href === url))
  if (!groupe) return null
  const enfants: NoeudNavigation[] = []
  for (const [i, lien] of groupe.liens.entries()) {
    const page = lien.libelle ? undefined : await pageParUrl(lien.href)
    if (!lien.libelle && !page) throw new Error(`Groupe « ${groupe.titre} » : aucune page à l’adresse ${lien.href}.`)
    enfants.push({
      titre: lien.libelle ?? page!.data.secondaryNav?.title ?? page!.data.title ?? lien.href,
      lang: page && langDuLibelle(page.data.lang),
      url: lien.href,
      ordre: i,
      enfants: [],
    })
  }
  return { titre: groupe.titre, enfants }
}

export type NoeudNavigation = {
  titre: string
  /** Langue du titre, seulement si elle diffère du français */
  lang?: string
  url: string
  ordre: number
  enfants: NoeudNavigation[]
}

/**
 * Arbre de la navigation secondaire d'une section de premier niveau
 * (/obtenir/, /a-propos/…). Reprend gatsby-plugin-bib-secondary-nav en
 * corrigeant ses défauts : correspondance des enfants ancrée sur le parent
 * (plus de « frères » attrapés par préfixe commun) et chemins identiques aux
 * URL réelles des pages.
 */
export async function navigationDeSection(section: string): Promise<NoeudNavigation | null> {
  const pages = (await toutesLesPages()).filter((p) => p.id === section || p.id.startsWith(`${section}/`))
  const racine = pages.find((p) => p.id === section)
  if (!racine) return null

  const noeud = (page: Page): NoeudNavigation => ({
    titre: page.data.secondaryNav?.title ?? page.data.title ?? page.id,
    lang: langDuLibelle(page.data.lang),
    url: urlDePage(page),
    ordre: page.data.secondaryNav?.order ?? Number.POSITIVE_INFINITY,
    enfants: [],
  })

  const parId = new Map(pages.filter((p) => p.data.title || p.data.secondaryNav?.title).map((p) => [p.id, { page: p, noeud: noeud(p) }]))
  for (const [id, { page, noeud: n }] of parId) {
    if (id === section || page.data.secondaryNav?.hidden) continue
    const parent = parId.get(id.slice(0, id.lastIndexOf('/')))
    parent?.noeud.enfants.push(n)
  }
  const trier = (n: NoeudNavigation) => {
    // À ordre égal, l'ordre des fichiers (alphabétique), comme directoryTree
    n.enfants.sort((a, b) => a.ordre - b.ordre || a.url.localeCompare(b.url, 'fr'))
    n.enfants.forEach(trier)
  }
  const resultat = parId.get(section)?.noeud ?? null
  // Liens vers des pages rangées hors de la section (secondaryNav.links de la page de section)
  for (const lien of racine.data.secondaryNav?.links ?? []) {
    resultat?.enfants.push({ titre: lien.title, url: lien.url, ordre: lien.order ?? Number.POSITIVE_INFINITY, enfants: [] })
  }
  if (resultat) trier(resultat)
  return resultat
}
