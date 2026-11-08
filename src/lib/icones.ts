/*
 * Composant d'icône à partir du nom écrit par un rédacteur (directive
 * `:icone[books]` d'une page Markdown, champ `icone:` d'une vitrine).
 *
 * Le nom est vérifié au build par src/plugins/icones.mjs ; ici, on charge
 * seulement le module de l'icône demandée. import.meta.glob en mode paresseux
 * ne charge que les icônes réellement employées, sans import en baril de
 * toute la bibliothèque Phosphor.
 */
import * as maison from '@/components/contenu/icones'
import { messageIconeInconnue, trouverIcone } from '@/plugins/icones.mjs'

const PHOSPHOR = import.meta.glob<Record<string, unknown>>('/node_modules/@phosphor-icons/react/dist/ssr/*.es.js')

export async function composantIcone(nom: string): Promise<any> {
  const trouvee = trouverIcone(nom)
  if (trouvee?.maison) return (maison as Record<string, unknown>)[trouvee.maison]
  const charger = trouvee?.phosphor && PHOSPHOR[`/node_modules/@phosphor-icons/react/dist/ssr/${trouvee.phosphor}.es.js`]
  if (!charger) throw new Error(messageIconeInconnue(nom))
  return (await charger())[`${trouvee.phosphor}Icon`]
}
