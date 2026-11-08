/*
 * Moteur de la recherche interne : charge l'index statique et MiniSearch à
 * la demande (première ouverture ou survol du bouton), puis cherche et
 * regroupe les résultats par section. Rien n'est téléchargé tant que
 * personne ne cherche : l'index et MiniSearch pèsent plus que la coquille.
 *
 * Deux index : celui du site (la boîte de recherche) et, pour les
 * suggestions du menu, le même réuni à celui des sites voisins, Boîte à
 * outils et Studio·bib (voir scripts/indexer-externes.mjs) : un seul index,
 * pour que la pertinence se compare d'une source à l'autre.
 */
import type MiniSearch from 'minisearch'
import { avecBase } from '@/lib/chemin'
import { sansAccents } from '@/lib/texte.mjs'

type Resultat = { title: string; excerpt: string; url: string }
export type Groupe = { section: string; items: Resultat[] }

// `words` (mots de tout le texte d'une page) sert à chercher, pas à afficher
type Document = Resultat & { id: number; section: string; words?: string }

// Les accents sont ignorés (« pret » trouve « Prêt ») : en français, on tape
// souvent sans accent, et la tolérance aux fautes ne suffisait pas à combler
// l'écart sur les mots courts.
const sansAccentsMinuscules = (terme: string) => sansAccents(terme).toLowerCase()

type CleIndex = 'site' | 'sites'
const FICHIERS: Record<CleIndex, string[]> = { site: ['/search-index.json'], sites: ['/search-index.json', '/search-index-externe.json'] }

const lireJson = (fichier: string) => fetch(avecBase(fichier)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))

const chargements = new Map<CleIndex, Promise<MiniSearch<Document>>>()

export function chargerIndex(cle: CleIndex = 'site') {
  if (chargements.has(cle)) return chargements.get(cle)!
  const chargement = Promise.all([import('minisearch'), Promise.all(FICHIERS[cle].map(lireJson))])
    .then(([{ default: MiniSearchClasse }, fichiers]: [{ default: typeof MiniSearch }, Omit<Document, 'id'>[][]]) => {
      const donnees = fichiers.flat()
      const index = new MiniSearchClasse<Document>({
        fields: ['title', 'excerpt', 'words'],
        storeFields: ['title', 'excerpt', 'url', 'section'],
        processTerm: sansAccentsMinuscules,
        searchOptions: {
          prefix: true, // des résultats dès les premières lettres
          fuzzy: 0.2, // tolère les petites fautes de frappe
          // Un mot du titre compte plus que l'extrait, qui compte plus que le
          // reste de la page : la page qui porte le sujet passe en tête
          boost: { title: 2, words: 0.5 },
        },
      })
      index.addAll(donnees.map((entree, id) => ({ id, ...entree })))
      return index
    })
    .catch((erreur) => {
      // On permet une nouvelle tentative à la prochaine ouverture
      chargements.delete(cle)
      throw erreur
    })
  chargements.set(cle, chargement)
  return chargement
}

/** Résultats groupés par section, dans l'ordre de leur premier résultat (score) */
export function chercher(index: MiniSearch<Document>, requete: string): Groupe[] {
  if (!requete.trim()) return []
  const groupes = new Map<string, Resultat[]>()
  for (const { title, excerpt, url, section } of index.search(requete)) {
    if (!groupes.has(section)) groupes.set(section, [])
    groupes.get(section)!.push({ title, excerpt, url })
  }
  return Array.from(groupes, ([section, items]) => ({ section, items }))
}

export type Suggestion = Resultat & { section: string }

/**
 * Suggestions sous un champ : tous les mots d'abord (« citer apa » ne
 * propose pas chaque page qui parle de citer), sinon n'importe lequel ; pas
 * de tolérance aux fautes sur les mots courts, où une lettre change le mot
 * (« vpn » trouvait « van »).
 */
export function suggerer(index: MiniSearch<Document>, requete: string): Suggestion[] {
  if (!requete.trim()) return []
  const fuzzy = (terme: string) => (terme.length > 4 ? 0.2 : false)
  let resultats = index.search(requete, { combineWith: 'AND', fuzzy })
  if (!resultats.length) resultats = index.search(requete, { fuzzy })
  return resultats.map(({ title, excerpt, url, section }) => ({ title, excerpt, url, section }))
}
