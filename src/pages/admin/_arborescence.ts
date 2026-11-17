import type { Page } from '@/lib/contenu'

/*
 * Dossiers de src/content/pages, pour la collection « Pages » de Decap
 * (config.yml.ts : choix de l'emplacement) et pour arborescence.json
 * (libellés de l'arborescence du menu de gauche, garde-fou à
 * l'enregistrement).
 *
 * Le chemin est celui de meta.path dans Decap : relatif à src/content/pages,
 * sans barre initiale, « / » pour la racine.
 */

export type Dossier = {
  /** `a-propos/carriere`, ou `/` pour la racine */
  chemin: string
  /** Libellé du dossier seul : « Carrière » */
  nom: string
  /** Libellé complet : « À propos › Carrière » */
  libelle: string
}

const RACINE = 'src/content/pages/'

// Emplacement que Decap accepte : chaque segment déjà « nettoyé » selon la
// configuration slug (ascii, accents retirés), sinon « chemin invalide ».
// Une page créée dans Decap garde les accents de son titre dans le nom de
// fichier (« réserve.md ») : elle ne peut pas recevoir de sous-pages depuis
// Decap, il faut d'abord renommer le fichier dans le dépôt.
const EMPLACEMENT_VALIDE = /^[\w.~-]+(\/[\w.~-]+)*$/

/** Dossier d'une page, relatif à src/content/pages (`''` à la racine) */
export function dossierDePage(page: Page) {
  const chemin = (page.filePath ?? '').replace(/^\.\//, '')
  return chemin.startsWith(RACINE) ? chemin.slice(RACINE.length).split('/').slice(0, -1).join('/') : ''
}

/** Chemin d'une page sans extension, relatif à src/content/pages : `a-propos/carriere/index` */
function cheminDePage(page: Page) {
  const chemin = (page.filePath ?? '').replace(/^\.\//, '')
  return chemin.startsWith(RACINE) ? chemin.slice(RACINE.length).replace(/\.(mdx?|yaml)$/i, '') : ''
}

export function dossiersDePages(pages: Page[]): Dossier[] {
  // Page qui donne son nom à un dossier : sa page d'index (texte ou vitrine),
  // ou la page .md du même nom à côté (« politiques-reglement.md » pour le
  // dossier « politiques-reglement/ »)
  const parDossier = new Map<string, Page>()
  for (const page of pages) {
    const chemin = cheminDePage(page)
    if (/(^|\/)index$/i.test(chemin)) parDossier.set(chemin.replace(/\/?index$/i, ''), page)
    else if (!parDossier.has(chemin)) parDossier.set(chemin, page)
  }
  const nom = (chemin: string) => {
    const page = parDossier.get(chemin)
    const segment = chemin.split('/').pop() ?? chemin
    return page?.data.crumbLabel ?? page?.data.title ?? segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  // Tous les dossiers qui contiennent une page, et leurs parents ; plus
  // chaque page .md qui n'a pas encore de sous-pages, pour pouvoir lui en
  // créer (fichier dans le dossier du même nom : l'adresse de la page ne
  // change pas). Pas les démonstrations (/dev/), ni les .mdx (« nouvelles »
  // est aussi une route du site).
  const chemins = new Set<string>()
  for (const page of pages) {
    const segments = dossierDePage(page).split('/').filter(Boolean)
    if (segments[0] === 'dev') continue
    segments.forEach((_, i) => chemins.add(segments.slice(0, i + 1).join('/')))
    const chemin = cheminDePage(page)
    if (page.filePath?.endsWith('.md') && !/(^|\/)index$/i.test(chemin) && EMPLACEMENT_VALIDE.test(chemin)) chemins.add(chemin)
  }

  const dossiers = [...chemins].map((chemin) => {
    const parties = chemin.split('/')
    return {
      chemin,
      nom: nom(chemin),
      libelle: parties.map((_, i) => nom(parties.slice(0, i + 1).join('/'))).join(' › '),
    }
  })
  dossiers.sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
  return [{ chemin: '/', nom: 'Pages', libelle: 'Pages générales (racine du site)' }, ...dossiers]
}
