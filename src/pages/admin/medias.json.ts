import type { APIRoute, ImageMetadata } from 'astro'
import { getImage } from 'astro:assets'
import { getCollection } from 'astro:content'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative } from 'node:path'
import { toutesLesPages } from '@/lib/contenu'
import { NOMS_BANNIERES } from '@/lib/bannieres'
import { dossiersDePages } from './_arborescence'

/*
 * Médiathèque de l'interface de rédaction (/admin/medias.json), lue par
 * public/admin/medias.js. Le bouton « Media » de Decap ne liste qu'un dossier
 * global (sans sous-dossiers) ; les images du site sont rangées à côté des
 * contenus (dossiers images/ de src/content, photos du répertoire,
 * bannières). Pour
 * chacune : dossier, dimensions, poids, vignette et version agrandie
 * (générées par Astro), et pages qui l'utilisent :
 * - chemins relatifs (« ./images/x.webp », « photos/x.webp ») dans les
 *   pages, nouvelles, vitrines et données ;
 * - bannières désignées par leur nom (imageName, banniere.image) ;
 * - photos du répertoire du personnel (nom de la personne).
 *
 * Générée au build : une image ajoutée en ligne y apparaît au build suivant.
 */

export const prerender = true

const RACINE = process.cwd()
const CONTENU = 'src/content'
const EXTENSIONS_IMAGES = /\.(png|jpe?g|webp|gif|avif|svg)$/i
const EXTENSIONS_TEXTE = /\.(md|mdx|ya?ml|json)$/i
const DOSSIER_BANNIERES = 'src/content/pages/images/super-heroes'

const MODULES = import.meta.glob<{ default: ImageMetadata }>('/src/content/**/*.{png,jpg,jpeg,webp,gif,avif,svg,PNG,JPG,JPEG,WEBP}', { eager: true })

type Utilisation = { titre: string; fichier: string; entree: string | null }

const sansPrefixe = (chemin: string) => chemin.replace(/^\.?\//, '')

function fichiersTexte(): string[] {
  return readdirSync(join(RACINE, CONTENU), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && EXTENSIONS_TEXTE.test(e.name))
    .map((e) => relative(RACINE, join(e.parentPath, e.name)).replaceAll('\\', '/'))
}

/** Libellé d'un dossier d'images : « Obtenir », « Bannières », « Nouvelles 2025 »… */
function libelleGroupe(dossier: string, libelles: Map<string, string>) {
  const relatif = dossier.replace(/^src\/content\/?/, '')
  if (dossier === DOSSIER_BANNIERES) return { libelle: 'Bannières', rang: 0 }
  if (relatif.startsWith('personnel')) return { libelle: 'Répertoire du personnel', rang: 4 }
  if (relatif.startsWith('bibliotheques')) return { libelle: 'Bibliothèques', rang: 3 }
  const nouvelle = relatif.match(/^nouvelles\/(\d{4})/)
  if (nouvelle) return { libelle: `Nouvelles ${nouvelle[1]}`, rang: 2 }
  const [avant, apres] = relatif.replace(/^pages\/?/, '').split(/\/?images\/?/)
  const base = avant ? (libelles.get(avant) ?? avant) : 'Pages générales et accueil'
  return { libelle: apres ? `${base} › ${apres}` : base, rang: 1 }
}

export const GET: APIRoute = async () => {
  const pages = await toutesLesPages()
  const nouvelles = await getCollection('nouvelles')
  const libelles = new Map(dossiersDePages(pages).map((d) => [d.chemin, d.libelle]))

  // Fichier de contenu → titre et adresse dans Decap
  const parFichier = new Map<string, Omit<Utilisation, 'fichier'>>()
  for (const page of pages) {
    const fichier = sansPrefixe(page.filePath ?? '')
    const relatif = fichier.replace(/^src\/content\/pages\//, '').replace(/\.(mdx?|yaml)$/, '')
    const entree = fichier.endsWith('.md')
      ? `#/collections/pages/entries/${relatif.split('/').map(encodeURIComponent).join('/')}`
      : fichier.endsWith('.yaml')
        ? `#/collections/vitrines/entries/${encodeURIComponent(page.id.replaceAll('/', '--'))}`
        : null
    parFichier.set(fichier, { titre: page.data.title ?? page.id, entree })
  }
  for (const nouvelle of nouvelles) {
    const fichier = sansPrefixe(nouvelle.filePath ?? '')
    const relatif = fichier.replace(/^src\/content\/nouvelles\//, '').replace(/\.mdx?$/, '')
    parFichier.set(fichier, { titre: `Nouvelle : ${nouvelle.data.title}`, entree: `#/collections/nouvelles/entries/${relatif.split('/').map(encodeURIComponent).join('/')}` })
  }

  // Images connues, par chemin dans le dépôt
  const images = new Map<string, { meta: ImageMetadata; utilisations: Utilisation[] }>()
  for (const [chemin, module] of Object.entries(MODULES)) images.set(sansPrefixe(chemin), { meta: module.default, utilisations: [] })
  const banniere = (nom: string) => [...images.keys()].find((c) => c.startsWith(`${DOSSIER_BANNIERES}/`) && posix.basename(c).replace(/\.[^.]+$/, '') === nom)

  const ajouter = (image: string | undefined, utilisation: Utilisation) => {
    const entree = image && images.get(image)
    if (entree && !entree.utilisations.some((u) => u.fichier === utilisation.fichier && u.titre === utilisation.titre)) entree.utilisations.push(utilisation)
  }

  for (const fichier of fichiersTexte()) {
    let texte: string
    try {
      texte = readFileSync(join(RACINE, fichier), 'utf8')
    } catch {
      continue
    }
    const dossier = posix.dirname(fichier)
    const source = parFichier.get(fichier) ?? { titre: fichier.replace(/^src\/content\//, ''), entree: null }

    // Répertoire du personnel : une utilisation par personne. La photo est
    // désignée sans dossier ni extension obligatoires, comme dans
    // lib/personnel.ts (« myriam-boyer » trouve photos/myriam-boyer.webp)
    if (fichier === 'src/content/personnel/personnel.json') {
      const cle = (c: string) => c.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase()
      const photos = new Map([...images.keys()].filter((c) => c.startsWith(`${dossier}/photos/`)).map((c) => [cle(c), c]))
      try {
        for (const p of JSON.parse(texte).personnes ?? []) {
          if (p.photo) ajouter(photos.get(cle(p.photo)), { titre: `Répertoire : ${p.prenom} ${p.nom}`, fichier, entree: '#/collections/personnel/entries/personnel' })
        }
      } catch {
        // JSON illisible : le build le signale ailleurs
      }
      continue
    }
    // Chemins relatifs vers une image
    for (const [, ref] of texte.matchAll(/["'(\s:=]((?:\.{1,2}\/)*[\w-][\w./-]*\.(?:png|jpe?g|webp|gif|avif|svg))(?=["')\s#?]|$)/gi)) {
      if (ref.startsWith('/') || /^https?:/i.test(ref)) continue
      ajouter(posix.normalize(posix.join(dossier, ref)), { ...source, fichier })
    }
    // Bannières par leur nom (imageName: x, imageName="x", banniere.image: x)
    for (const [, nom] of texte.matchAll(/\b(?:imageName|image)\s*[:=]\s*["']?([a-z0-9-]+)["']?(?=[\s"'/>]|$)/g)) {
      if (NOMS_BANNIERES.includes(nom)) ajouter(banniere(nom), { ...source, fichier })
    }
  }

  // Code du site (composants, données, bibliothèques) qui nomme une image par
  // son fichier : « _profile.webp », photo par défaut du répertoire
  const code = readdirSync(join(RACINE, 'src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|astro|mjs|js|css)$/.test(e.name))
    .map((e) => relative(RACINE, join(e.parentPath, e.name)).replaceAll('\\', '/'))
    .filter((f) => !f.startsWith('src/pages/admin/') && !f.startsWith('src/content/'))
  for (const fichier of code) {
    let texte: string
    try {
      texte = readFileSync(join(RACINE, fichier), 'utf8')
    } catch {
      continue
    }
    // Nom entre guillemets ou après un « / » (pas les exemples des commentaires)
    for (const chemin of images.keys()) {
      const nom = posix.basename(chemin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`['"\`/]${nom}['"\`]`).test(texte)) ajouter(chemin, { titre: `Code du site : ${fichier.replace(/^src\//, '')}`, fichier, entree: null })
    }
  }

  const resultat = []
  for (const [chemin, { meta, utilisations }] of images) {
    const svg = /\.svg$/i.test(chemin)
    let vignette = meta.src
    let grande = meta.src
    if (!svg) {
      vignette = (await getImage({ src: meta, width: Math.min(360, meta.width), format: 'webp' })).src
      grande = (await getImage({ src: meta, width: Math.min(1600, meta.width), format: 'webp' })).src
    }
    const dossier = posix.dirname(chemin)
    let poids = 0
    try {
      poids = statSync(join(RACINE, chemin)).size
    } catch {
      poids = 0
    }
    resultat.push({
      chemin,
      nom: posix.basename(chemin),
      dossier,
      ...libelleGroupe(dossier, libelles),
      largeur: meta.width ?? null,
      hauteur: meta.height ?? null,
      poids,
      vignette,
      grande,
      banniere: dossier === DOSSIER_BANNIERES ? posix.basename(chemin).replace(/\.[^.]+$/, '') : null,
      utilisations: utilisations.sort((a, b) => a.titre.localeCompare(b.titre, 'fr')),
    })
  }
  resultat.sort((a, b) => a.rang - b.rang || a.libelle.localeCompare(b.libelle, 'fr') || a.nom.localeCompare(b.nom, 'fr'))

  return new Response(JSON.stringify({ images: resultat }) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
