/*
 * Photos des lieux, nommées d'après le code de bibliothèque de l'API
 * (ss.webp, mu.webp…), comme content/bibliotheques/images dans coquille-web.
 * Il n'y en a pas pour mv, marcel-laurin et les points de service : la fiche
 * s'en passe.
 */
import type { ImageMetadata } from 'astro'

const fichiers = import.meta.glob<{ default: ImageMetadata }>('./images/*.webp', { eager: true })

export const imagesLieux: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(fichiers).map(([chemin, module]) => [chemin.replace(/^.*\/(.+)\.webp$/, '$1'), module.default])
)
