/*
 * Couleurs du thème de coquille-web vers les jetons de tokens.css.
 *
 * Deux lectures coexistent, comme dans la source : `couleurTheme` pour le
 * texte (Typographie, Box : `color="text.secondary"`, l'orange passe par sa
 * variante lisible), `couleurPalette` pour les fonds et les icônes des cartes
 * (`bgColor="vertPale"`, l'orange reste l'orange graphique).
 */

import { CLES_RENOMMEES, JETON_DE_CLE } from './couleurs-renommees.mjs'

// Jetons de tokens.css, sous leur nom de palette dans le contenu
const JETONS = new Set([
  'bleu-principal',
  'bleu-principal-fonce',
  'bleu-fonce',
  'bleu-10',
  'bleu-20',
  'jaune',
  'jaune-40',
  'rose',
  'rose-50',
  'rose-500',
  'rouge-orange',
  'orange',
  'vert',
  'vert-fonce',
  'violet-fonce',
])

/**
 * Clé de palette du contenu (`vert`, `bleu10`, `primary`) vers son jeton ;
 * une autre valeur (`'#fff'`) passe telle quelle.
 */
export function couleurPalette(nom: string | undefined): string | undefined {
  if (!nom) return undefined
  // Anciennes clés des pages .mdx (vertPale…)
  const brute = nom.replace(/\.main$/, '')
  const cle = CLES_RENOMMEES[brute as keyof typeof CLES_RENOMMEES] ?? brute
  const harmonium = JETON_DE_CLE[cle as keyof typeof JETON_DE_CLE]
  if (harmonium) return `var(--${harmonium})`
  if (cle === 'primary') return 'var(--bleu-principal)'
  if (cle === 'white' || cle === 'common.white') return 'var(--couleur-sur-fonce)'
  const jeton = cle
    .replace(/([A-Z])/g, '-$1')
    .replace(/(\d+)/, '-$1')
    .toLowerCase()
  return JETONS.has(jeton) ? `var(--${jeton})` : nom
}

/**
 * Couleurs du thème MUI telles que le contenu les écrit (`color="text.secondary"`,
 * `color="primary"`, noms de palette) vers les jetons. Le texte orange passe
 * par la variante assombrie, seule lisible sur les fonds clairs.
 */
const COULEURS: Record<string, string> = {
  primary: 'var(--bleu-principal)',
  'primary.main': 'var(--bleu-principal)',
  'text.primary': 'var(--couleur-texte)',
  'text.secondary': 'var(--couleur-texte-secondaire)',
  inherit: 'inherit',
  bleuPrincipal: 'var(--bleu-principal)',
  bleuFonce: 'var(--bleu-fonce)',
  bleu600: 'var(--bleu-principal-fonce)',
  rougeOrange: 'var(--rouge-orange-texte)',
  vertFonce: 'var(--vert-fonce)',
  white: 'var(--couleur-sur-fonce)',
  blanc: 'var(--couleur-sur-fonce)',
}

export function couleurTheme(nom: string | undefined): string | undefined {
  if (!nom) return undefined
  const cle = nom.replace(/\.main$/, '')
  return COULEURS[nom] ?? COULEURS[cle] ?? nom
}
