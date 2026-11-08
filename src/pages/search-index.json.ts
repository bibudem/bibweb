import type { APIRoute } from 'astro'
import { toutesLesPages, toutesLesNouvelles, estExclueDeLaRecherche, estVitrine, urlDePage, urlDeNouvelle } from '@/lib/contenu'
import { bibliotheques } from '@/data/bibliotheques'
import { personnel, urlFichePersonne } from '@/lib/personnel'
import { extrait, extraitVitrine } from '@/lib/extrait'
import { motsDistincts } from '@/lib/texte.mjs'

/*
 * Index de la recherche interne, généré au build en fichier statique
 * (/search-index.json), au format de coquille-web :
 * [{ title, excerpt, url, section }]. La recherche du menu
 * (coquille/entete/RechercheMenu.astro) et /resultats/ le chargent à la demande
 * (lib/recherche/moteur.ts).
 *
 * Écart voulu : les pages et les nouvelles portent en plus `words`, les mots
 * de tout leur texte. La source ne cherchait que dans le titre et les 200
 * premiers caractères : « Sofia » ou « citer » ne trouvaient rien. Chaque mot
 * n'y figure qu'une fois (l'ordre et la fréquence ne servent pas au
 * classement, qui privilégie le titre) : l'index reste léger.
 */

export const prerender = true

type Entree = { title: string; excerpt: string; url: string; section: 'Pages' | 'Nouvelles' | 'Bibliothèques' | 'Personnel'; words?: string }

const estMarkdown = (entree: { filePath?: string }) => entree.filePath?.endsWith('.md') ?? false

export const GET: APIRoute = async () => {
  const entrees: Entree[] = []

  for (const page of await toutesLesPages()) {
    const title = page.data.title
    if (!title || estExclueDeLaRecherche(page)) continue
    const texte = (longueur?: number) =>
      estVitrine(page) ? extraitVitrine([page.data.banniere, ...page.data.sections], title, longueur) : extrait(page.body, title, longueur, page.filePath?.endsWith('.md'))
    entrees.push({ title, excerpt: texte(), url: urlDePage(page), section: 'Pages', words: motsDistincts(texte(Infinity)) })
  }

  for (const nouvelle of await toutesLesNouvelles()) {
    const { title } = nouvelle.data
    entrees.push({ title, excerpt: extrait(nouvelle.body, title, undefined, estMarkdown(nouvelle)), url: urlDeNouvelle(nouvelle), section: 'Nouvelles', words: motsDistincts(extrait(nouvelle.body, title, Infinity, estMarkdown(nouvelle))) })
  }

  for (const { ancreHoraires, titre, autreTitre } of bibliotheques) {
    entrees.push({ title: titre, excerpt: autreTitre !== titre ? autreTitre : '', url: `/horaires/#${ancreHoraires}`, section: 'Bibliothèques' })
  }

  // Il n'y a pas de fiche par personne : l'entrée mène au répertoire, qui
  // préremplit sa recherche avec ?q=
  for (const personne of personnel()) {
    entrees.push({
      title: personne.nomComplet,
      excerpt: [personne.fonction, personne.direction].filter(Boolean).join(' — '),
      url: urlFichePersonne(personne),
      section: 'Personnel',
    })
  }

  return new Response(JSON.stringify(entrees), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
