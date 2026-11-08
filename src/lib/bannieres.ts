/*
 * Images des bannières (BanniereAccueil, BannierePage, BanniereSection), désignées
 * par leur nom de fichier sans extension (`imageName="recherche"`), comme la
 * source GraphQL `super-heroes` de coquille-web.
 *
 * import.meta.glob les résout au build : un nom inconnu fait échouer le build
 * avec un message clair, au lieu du plantage au rendu de la source.
 */
import type { ImageMetadata } from 'astro'

const IMAGES = import.meta.glob<{ default: ImageMetadata }>('/src/content/pages/images/super-heroes/*.{jpg,jpeg,png,webp,avif}', { eager: true })

const PAR_NOM = new Map(Object.entries(IMAGES).map(([chemin, module]) => [chemin.split('/').pop()!.replace(/\.[^.]+$/, ''), module.default]))

/** Noms des bannières disponibles, triés (schéma des vitrines, menus du CMS) */
export const NOMS_BANNIERES = [...PAR_NOM.keys()].sort((a, b) => a.localeCompare(b, 'fr'))

export function imageBanniere(nom: string): ImageMetadata {
  const image = PAR_NOM.get(nom)
  if (!image) {
    throw new Error(`Image de bannière introuvable : « ${nom} ». Noms disponibles (src/content/pages/images/super-heroes/) : ${[...PAR_NOM.keys()].join(', ')}`)
  }
  return image
}

/**
 * Cadrage des photos dans la bannière basse des sous-pages (BanniereSection,
 * environ 230 px) : la hauteur gardée au recadrage, pour que les visages
 * restent sous l'en-tête (0 % : le haut de la photo, 50 % : le centre). Une
 * page peut le remplacer (`superHero.cadrage`). Photos sans personne : le
 * centre, par défaut.
 */
const CADRAGE_SECTION: Record<string, string> = {
  engagements: '25%',
  enseignement: '15%',
  espaces: '40%',
  'nous-joindre': '20%',
  'obtenir-mezzanine': '38%',
  recherche: '5%',
  diffuser: '55%',
}

export function cadrageSection(nom: string) {
  return CADRAGE_SECTION[nom]
}

// Les bannières couvrent toute la largeur de la fenêtre. On ne demande pas de
// variante plus large que l'original : Astro l'agrandirait pour rien.
const LARGEURS = [640, 960, 1280, 1600, 1920, 2400]

export function largeursPour(image: ImageMetadata, largeurs: number[] = LARGEURS) {
  const utiles = largeurs.filter((l) => l < image.width)
  return [...utiles, Math.min(image.width, largeurs[largeurs.length - 1])]
}
