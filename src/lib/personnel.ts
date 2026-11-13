import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'astro/zod'
import { sansAccents } from './texte.mjs'

/*
 * Répertoire du personnel, lu au build depuis
 * src/content/personnel/personnel.json (modifiable dans /admin/).
 *
 * Le fichier remplace l'ancien tableur liste-personnel.xlsx, déjà nettoyé à la
 * conversion (espaces en trop, « BIbliothécaire », listes séparées par « ; ») :
 * disciplines, expertises et bibliothèques y sont des listes. Les disciplines
 * sont des domaines d'études ; un service ou une expertise (ressources
 * humaines, Papyrus, prêt entre bibliothèques) va dans `expertises`. Il est validé ici : un champ
 * mal nommé ou une photo introuvable fait échouer le build, avec la personne
 * en cause.
 */

export type Personne = {
  id: string
  prenom: string
  nom: string
  nomComplet: string
  fonction: string
  direction?: string
  /** Disciplines d'études (bibliothécaires disciplinaires) */
  disciplines: string[]
  /** Expertises et services (ressources humaines, prêt entre bibliothèques, Papyrus…) */
  expertises: string[]
  bibliotheques: string[]
  telephone?: string
  courriel?: string
  teams?: string
  /** Nom du fichier de la photo dans src/content/personnel/photos, ou undefined */
  photo?: string
}

// Depuis la racine du projet, comme DOSSIER_BANNIERES (lib/schema-vitrines.ts) :
// un chemin relatif à ce module ne tient plus une fois le code regroupé par
// le build (dist/.prerender/…)
const DOSSIER = join(process.cwd(), 'src/content/personnel') + '/'

const versId = (texte: string) =>
  sansAccents(texte)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const texte = z.string().trim().min(1)
const SCHEMA = z.object({
  personnes: z.array(
    z
      .object({
        prenom: texte,
        nom: texte,
        fonction: texte,
        direction: texte.optional(),
        disciplines: z.array(texte).default([]),
        expertises: z.array(texte).default([]),
        bibliotheques: z.array(texte).default([]),
        telephone: texte.optional(),
        courriel: z.string().trim().email().optional(),
        teams: z.string().trim().url().optional(),
        /** Nom du fichier dans src/content/personnel/photos (l'extension est facultative) */
        photo: texte.optional(),
      })
      .strict(),
  ),
})

let cache: Personne[] | undefined

export function personnel(): Personne[] {
  // En développement, le fichier est relu à chaque page : une fiche modifiée
  // (à la main ou dans /admin/) paraît sans redémarrer le serveur
  if (cache && !import.meta.env?.DEV) return cache
  const fichier = `${DOSSIER}personnel.json`
  const resultat = SCHEMA.safeParse(JSON.parse(readFileSync(fichier, 'utf8')))
  if (!resultat.success) {
    const probleme = resultat.error.issues[0]
    throw new Error(`src/content/personnel/personnel.json, ${probleme.path.join('.')} : ${probleme.message}`)
  }
  // La photo est associée sans extension ni dossier (le CMS peut écrire un
  // chemin) : « myriam-boyer » trouve « myriam-boyer.webp »
  const photos = new Map(readdirSync(`${DOSSIER}photos`).map((f) => [f.replace(/\.[^.]+$/, '').toLowerCase(), f]))

  cache = resultat.data.personnes
    .map((p) => {
      const nomComplet = `${p.prenom} ${p.nom}`
      const cle = p.photo?.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase()
      const photo = cle ? photos.get(cle) : undefined
      if (cle && !photo) throw new Error(`src/content/personnel/personnel.json, ${nomComplet} : photo « ${p.photo} » introuvable dans src/content/personnel/photos/.`)
      return {
        id: versId(nomComplet),
        prenom: p.prenom,
        nom: p.nom,
        nomComplet,
        fonction: p.fonction,
        direction: p.direction,
        disciplines: p.disciplines,
        expertises: p.expertises,
        bibliotheques: p.bibliotheques,
        telephone: p.telephone,
        courriel: p.courriel,
        teams: p.teams,
        photo,
      }
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'))
  return cache
}

/**
 * Fiche d'une personne : le répertoire filtré sur son nom (?q=), comme les
 * résultats « Personnel » de la recherche du site.
 */
export function urlFichePersonne(personne: Pick<Personne, 'nomComplet'>) {
  return `/nous-joindre/notre-equipe/?q=${encodeURIComponent(personne.nomComplet)}`
}
