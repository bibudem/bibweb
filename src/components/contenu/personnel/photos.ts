import type { ImageMetadata } from 'astro'
import type { Personne } from '@/lib/personnel'

/*
 * Photos du personnel (src/content/personnel/photos), indexées par nom de
 * fichier ; `_profile` sert de repli. Partagées par le répertoire et l'équipe
 * d'une bibliothèque.
 */
const fichiers = import.meta.glob<{ default: ImageMetadata }>('/src/content/personnel/photos/*.{jpg,jpeg,png,webp}', { eager: true })
const photos = new Map(Object.entries(fichiers).map(([chemin, module]) => [chemin.split('/').pop() ?? '', module.default]))
const photoParDefaut = photos.get('_profile.webp')

export function photoDe(personne: Pick<Personne, 'photo'>) {
  return (personne.photo && photos.get(personne.photo)) || photoParDefaut
}
