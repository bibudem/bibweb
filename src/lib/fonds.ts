/*
 * Fonds de couleur des bandes (Section), avec leur ton. Partagé par
 * Section.astro, les directives `:::section{fond=…}` et le schéma des
 * vitrines (champ `fond`), pour qu'une seule liste fasse foi.
 *
 * Ton de chaque fond, d'après les contrastes calculés (WCAG 2.x) :
 * - fonce : blanc ≥ 7,1:1 (bleu principal 7,10, bleu 600 10,30, vert foncé
 *   11,26, bleu foncé 18,17) ;
 * - moyen : le blanc ne passe pas (rouge orangé 3,61, violet 3,46, vert
 *   pâle 2,48), le bleu foncé oui (5,04 à 7,32) ; le lien bleu (1,97 à 4,33)
 *   et le texte orange non : ils prennent la couleur du texte (le lien reste
 *   souligné) ;
 * - clair : bleu foncé ≥ 13,6:1, lien bleu ≥ 5,32:1, texte orange ≥ 4,61:1.
 * Jaune et rose 500 sont « moyens » à cause du texte orange (4,03 et 3,75)
 * et du lien sur rose 500 (4,33).
 */
export const FONDS = {
  bleuPrincipal: { couleur: 'var(--bleu-principal)', ton: 'fonce' },
  bleuFonce: { couleur: 'var(--bleu-fonce)', ton: 'fonce' },
  bleu600: { couleur: 'var(--bleu-principal-fonce)', ton: 'fonce' },
  vertFonce: { couleur: 'var(--vert-fonce)', ton: 'fonce' },
  rougeOrange: { couleur: 'var(--rouge-orange)', ton: 'moyen' },
  violetFonce: { couleur: 'var(--violet-fonce)', ton: 'moyen' },
  vertPale: { couleur: 'var(--vert-pale)', ton: 'moyen' },
  jaune: { couleur: 'var(--jaune)', ton: 'moyen' },
  rose500: { couleur: 'var(--rose-500)', ton: 'moyen' },
  bleu100: { couleur: 'var(--couleur-teinte)', ton: 'clair' },
  bleu200: { couleur: 'var(--couleur-teinte-forte)', ton: 'clair' },
  jaunePale: { couleur: 'var(--couleur-teinte-jaune)', ton: 'clair' },
  rose100: { couleur: 'var(--couleur-teinte-rose)', ton: 'clair' },
  rose300: { couleur: 'var(--couleur-teinte-rose-forte)', ton: 'clair' },
} as const satisfies Record<string, { couleur: string; ton: 'fonce' | 'moyen' | 'clair' }>

export type Fond = keyof typeof FONDS

/** Noms des couleurs du thème, dans l'ordre ci-dessus */
export const NOMS_FONDS = Object.keys(FONDS) as [Fond, ...Fond[]]
