import { existsSync } from 'node:fs'
import { join } from 'node:path'

/*
 * Noms d'icônes écrits par les rédacteurs, dans les directives Markdown
 * (`:icone[books]`) et les vitrines YAML (`icone: books`).
 *
 * On accepte le nom affiché sur phosphoricons.com (`calendar-dots`) ou celui
 * du composant (`CalendarDots`, `CalendarDotsIcon`), plus quelques icônes
 * maison. Le nom est vérifié au build, ici, en JavaScript pur : ce module est
 * lu à la fois par le plugin remark (hors de Vite) et par le schéma des
 * vitrines, pour qu'une faute de frappe fasse échouer le build avec le nom
 * du fichier, au lieu d'une icône manquante en ligne.
 *
 * Le rendu (composant à partir du nom) est dans src/lib/icones.ts.
 */

/** Icônes maison (src/components/icones/) : nom pour le rédacteur → export de components/contenu/icones/index.ts */
export const ICONES_MAISON = {
  sofia: 'IconeSofia',
  burger: 'IconeMenuBurger',
  udem: 'IconeUdeM',
  // Flèches cerclées des liens du site (description des icônes d'accessibilite-web)
  'lien-interne': 'IconeFlecheCercle',
  'lien-externe': 'IconeFlecheDiagonaleCercle',
  // « Plus » dans une pastille : déployer un volet d'accordéon
  accordeon: 'IconeAccordeon',
  // Fleur du pilier « Savoirs autochtones » du site scienceouverte (engagements)
  'savoirs-autochtones': 'IconeSavoirsAutochtones',
}

const DOSSIER_PHOSPHOR = join(process.cwd(), 'node_modules/@phosphor-icons/react/dist/ssr')

/** `calendar-dots`, `CalendarDots` ou `CalendarDotsIcon` → `CalendarDots` */
function nomPhosphor(nom) {
  const brut = String(nom).trim()
  if (/^[A-Z]/.test(brut)) return brut.replace(/Icon$/, '')
  return brut
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((morceau) => morceau[0].toUpperCase() + morceau.slice(1))
    .join('')
}

/**
 * Description d'une icône d'après son nom, ou `null` si elle n'existe pas :
 * `{ maison: 'IconeSofia' }` ou `{ phosphor: 'CalendarDots' }`.
 */
export function trouverIcone(nom) {
  const cle = String(nom ?? '').trim()
  if (!cle) return null
  if (ICONES_MAISON[cle.toLowerCase()]) return { maison: ICONES_MAISON[cle.toLowerCase()] }
  const phosphor = nomPhosphor(cle)
  if (/^[A-Z][A-Za-z0-9]*$/.test(phosphor) && phosphor !== 'Index' && existsSync(join(DOSSIER_PHOSPHOR, `${phosphor}.es.js`))) {
    return { phosphor }
  }
  return null
}

/** Message d'erreur commun aux directives et aux vitrines */
export function messageIconeInconnue(nom) {
  return `Icône inconnue : « ${nom} ». Utilisez le nom d'une icône de https://phosphoricons.com (ex. books, calendar-dots) ou une icône maison (${Object.keys(ICONES_MAISON).join(', ')}).`
}
