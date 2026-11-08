/*
 * Largeurs et tailles des images du Markdown (RenduDirectives.astro et
 * composants de ce dossier) : avif et webp en plusieurs largeurs, comme le
 * MDX.
 */
import type { ImageMetadata } from 'astro'

// Une image du texte s'affiche au plus à sa taille réelle, et au plus sur la
// largeur d'une Section (1536 px moins ses marges de 64 px)
const LARGEUR_MAX = 1408
export function largeurs(image: ImageMetadata) {
  const largeur = Math.min(image.width, LARGEUR_MAX)
  return { widths: [600, 900, 1200].filter((l) => l < largeur).concat(largeur), sizes: `(min-width: ${largeur}px) ${largeur}px, 100vw` }
}

// Une image vectorielle ou animée se sert telle quelle
export const sansConversion = (image: ImageMetadata) => image.format === 'svg' || image.format === 'gif'

// Petite image d'image-texte et logos : affichées sur une hauteur fixe, en 1x et 2x
export function largeursHauteur(image: ImageMetadata, hauteur: number) {
  const largeur = Math.round((image.width / image.height) * hauteur)
  const widths = [largeur, largeur * 2].filter((l) => l <= image.width)
  return { widths: widths.length ? widths : [image.width], sizes: `${largeur}px` }
}
