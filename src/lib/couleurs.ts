/*
 * Couleurs du thème de coquille-web vers les jetons de tokens.css.
 *
 * Deux lectures coexistent, comme dans la source : `couleurTheme` pour le
 * texte (Typographie, Box : `color="text.secondary"`, l'orange passe par sa
 * variante lisible), `couleurPalette` pour les fonds et les icônes des cartes
 * (`bgColor="vertPale"`, l'orange reste l'orange graphique).
 */

// Jetons de tokens.css, sous leur nom de palette dans le contenu
const JETONS = new Set([
  'bleu-principal',
  'bleu-fonce',
  'bleu-100',
  'bleu-200',
  'jaune',
  'jaune-pale',
  'rose-100',
  'rose-300',
  'rose-500',
  'rouge-orange',
  'orange',
  'vert-fonce',
  'vert-pale',
  'violet-fonce',
])

/**
 * Clé de palette du contenu (`vertPale`, `bleu600`, `primary`) vers son jeton ;
 * une autre valeur (`'#fff'`, écrite par le contenu) passe telle quelle.
 */
export function couleurPalette(nom: string | undefined): string | undefined {
  if (!nom) return undefined
  const cle = nom.replace(/\.main$/, '')
  if (cle === 'primary') return 'var(--bleu-principal)'
  if (cle === 'white' || cle === 'common.white') return 'var(--couleur-sur-fonce)'
  const jeton = cle
    .replace(/([A-Z])/g, '-$1')
    .replace(/(\d+)/, '-$1')
    .toLowerCase()
  // « bleu600 » (contenu) : fusionné avec le bleu principal foncé, presque identique
  if (jeton === 'bleu-600') return 'var(--bleu-principal-fonce)'
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
