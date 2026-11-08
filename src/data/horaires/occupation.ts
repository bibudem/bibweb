/*
 * Achalandage des bibliothèques en temps réel : compteurs de personnes
 * Axper, lus par le relais n8n des Bibliothèques (le même que la page
 * https://studio.bib.umontreal.ca/occupation/, d'où viennent les
 * identifiants et les capacités ci-dessous).
 *
 * Clé : l'id du lieu dans lieux.ts. `capacite` : nombre de places, pour
 * passer du nombre de personnes présentes à un taux d'occupation.
 */

const RELAIS_OCCUPATION = 'https://ordo.bib.umontreal.ca/webhook/axper'
const LIVEVIEW = 'https://cloud.axper.com/api/LiveView/'

export const CAPTEURS: Record<string, { liveview: string; capacite: number }> = {
  'lettres-et-sciences-humaines': { liveview: '0232534a-6fb5-4f46-a694-0150cf7c803b', capacite: 702 },
  droit: { liveview: '3b296801-de07-4b59-a021-8a4e4806063e', capacite: 484 },
  'mathematiques-et-informatique': { liveview: '207eef5f-b115-4e3d-8a49-9ed47cc207e2', capacite: 224 },
  sante: { liveview: 'ad6f418c-8cfc-49a4-84b6-3b53f98638f8', capacite: 234 },
  kinesiologie: { liveview: '174b8dc7-ab11-40d8-b975-15ec5c9033f0', capacite: 129 },
  amenagement: { liveview: 'e5de541f-9f52-44c7-a532-9a8bae754e99', capacite: 133 },
  'marguerite-d-youville': { liveview: '90e3ca77-5750-4f22-bc77-2f2504f1a212', capacite: 151 },
  'hubert-reeves': { liveview: 'ff34308a-6b8b-4627-82b2-6bb6f43fd2f4', capacite: 197 },
  'therese-gouin-decarie': { liveview: '7e347ba2-ec2d-42cf-a0f9-a9d058dbfa30', capacite: 408 },
  musique: { liveview: 'bb42ee28-fca9-4337-b1ed-6eab9d20c2c8', capacite: 51 },
}

export const urlOccupation = (id: string) => `${RELAIS_OCCUPATION}?url=${encodeURIComponent(LIVEVIEW + CAPTEURS[id].liveview)}`

export type Niveau = 1 | 2 | 3

/**
 * Niveau d'achalandage d'un taux d'occupation (en %). Une salle d'étude paraît
 * pleine bien avant 100 % : on évite la place voisine d'un inconnu, et le
 * compteur compte les personnes, pas les places prises (personnel, passage).
 * D'où des seuils bas (50 et 85 %), et pas de « Complète », que le compteur
 * ne peut pas garantir. La page d'occupation du Studio garde ses propres
 * seuils (80 et 99 %) : les deux pages peuvent différer.
 */
export function niveauAchalandage(taux: number): { niveau: Niveau; texte: string } {
  if (taux < 50) return { niveau: 1, texte: 'Peu achalandée' }
  if (taux < 85) return { niveau: 2, texte: 'Achalandée' }
  return { niveau: 3, texte: 'Très achalandée, peu de places' }
}
