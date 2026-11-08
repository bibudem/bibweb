import { getCollection } from 'astro:content'
import { toutesLesNouvelles, urlDeNouvelle } from '@/lib/contenu'
import type { IdSujet } from '@/data/sujets'
// Seulement pour l'ordre du fichier, que getCollection ne garde pas : à date
// égale, les articles de presse restent dans l'ordre où l'équipe les a saisis.
import articles from '@/content/revue-de-presse/articles.json'

/*
 * Les nouvelles réunissent deux sources (useNouvelles de coquille-web) :
 * - nos communications (collection `nouvelles`), qui ont leur page ;
 * - la revue de presse (collection `revueDePresse`), des liens vers les
 *   articles parus dans les médias.
 * Tout est lu au build : les listes s'affichent sans JavaScript.
 */

export const TYPE_NOUVELLE = 'nouvelle'
export const TYPE_PRESSE = 'presse'

export type Actualite = {
  id: string
  type: typeof TYPE_NOUVELLE | typeof TYPE_PRESSE
  title: string
  url: string
  source?: string
  lang: string
  externe: boolean
  /** Sujets (src/data/sujets.ts), pour /nouvelles/?sujet=… */
  sujets: IdSujet[]
  /** AAAA-MM-JJ */
  date: string
  dateTexte: string
  annee: number
  timestamp: number
}

// Les dates du frontmatter (« AAAA-MM-JJ ») arrivent à minuit UTC : on les
// affiche en UTC pour ne pas tomber la veille au Québec.
const formatDate = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function champsDate(date: Date) {
  return {
    date: date.toISOString().slice(0, 10),
    dateTexte: formatDate.format(date),
    annee: date.getUTCFullYear(),
    timestamp: date.getTime(),
  }
}

/** Toutes les nouvelles, de la plus récente à la plus ancienne */
export async function toutesLesActualites(): Promise<Actualite[]> {
  const communications: Actualite[] = (await toutesLesNouvelles())
    .filter((n) => n.data.type === 'interne')
    .map((n) => ({
      id: n.id,
      type: TYPE_NOUVELLE,
      title: n.data.title,
      url: urlDeNouvelle(n),
      lang: 'fr',
      externe: false,
      sujets: n.data.sujets,
      ...champsDate(n.data.date),
    }))
  const presse: Actualite[] = (await getCollection('revueDePresse')).map(({ data }) => ({
    id: data.url,
    type: TYPE_PRESSE,
    title: data.title,
    url: data.url,
    source: data.source,
    lang: data.lang,
    externe: true,
    sujets: data.sujets,
    ...champsDate(data.date),
  }))
  const rang = new Map(articles.map((a: { url: string }, i: number) => [a.url, i]))
  presse.sort((a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0))
  return [...communications, ...presse].sort((a, b) => b.timestamp - a.timestamp)
}
