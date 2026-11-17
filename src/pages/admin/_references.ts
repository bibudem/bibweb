import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/*
 * Liens entrants de chaque page, pour l'interface de rédaction : avant de
 * supprimer une page, savoir quels fichiers pointent vers son adresse.
 *
 * Relevé textuel des adresses internes (« /obtenir/peb/ », « /obtenir/peb »,
 * « /obtenir/peb/#ancre ») dans :
 * - src/content : pages, nouvelles, données éditées dans Decap. Un lien
 *   supprimé y devient un lien mort (404), sans faire échouer le build ;
 * - src/data, src/components, src/layouts : menus (navigation.ts), groupes
 *   de pages, gabarits. Une page absente d'un groupe de navigation fait
 *   échouer le build (navigationDeGroupe) ; ces liens se corrigent dans le
 *   code : la suppression est alors refusée (`bloquant`).
 */

export type Reference = { fichier: string; bloquant: boolean }

const RACINE = process.cwd()
const DOSSIERS = [
  { dossier: 'src/content', bloquant: false },
  { dossier: 'src/data', bloquant: true },
  { dossier: 'src/components', bloquant: true },
  { dossier: 'src/layouts', bloquant: true },
]
const EXTENSIONS = /\.(md|mdx|yaml|yml|json|ts|astro)$/i
// Adresse interne : « / » précédé d'un délimiteur (espace, guillemet, parenthèse,
// =, crochet, :), segments en minuscules, fin d'adresse (#, ?, guillemet…)
const ADRESSE = /(?<=[\s("'`=[:>])\/([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)\/?(?=[#?)"'`\s\]>,;]|$)/g

function fichiersDe(dossier: string): string[] {
  try {
    return readdirSync(join(RACINE, dossier), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && EXTENSIONS.test(e.name))
      .map((e) => relative(RACINE, join(e.parentPath, e.name)).replaceAll('\\', '/'))
  } catch {
    return []
  }
}

/** id de page → fichiers qui contiennent son adresse (hors le fichier de la page) */
export function referencesDesPages(ids: Iterable<string>, fichierDe: Map<string, string>): Map<string, Reference[]> {
  const connus = new Set(ids)
  const resultat = new Map<string, Reference[]>()
  for (const { dossier, bloquant } of DOSSIERS) {
    for (const fichier of fichiersDe(dossier)) {
      let texte: string
      try {
        texte = readFileSync(join(RACINE, fichier), 'utf8')
      } catch {
        continue
      }
      const vus = new Set<string>()
      for (const [, id] of texte.matchAll(ADRESSE)) {
        if (!connus.has(id) || vus.has(id) || fichierDe.get(id) === fichier) continue
        vus.add(id)
        resultat.set(id, [...(resultat.get(id) ?? []), { fichier, bloquant }])
      }
    }
  }
  return resultat
}
