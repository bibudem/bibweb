/*
 * Petits outils de style partagés par les composants MDX.
 *
 * Le contenu converti passe `style` en chaîne ou en objet JSX ; les
 * composants y ajoutent leurs propres variables (couleur de fond, cadrage).
 * On fusionne tout en une seule chaîne pour l'attribut.
 */

type ValeurStyle = string | number | undefined | null | false
export type Style = string | Record<string, ValeurStyle> | undefined | null

// Propriétés numériques qui restent sans unité, comme en React
const SANS_UNITE = new Set(['flex', 'flex-grow', 'flex-shrink', 'opacity', 'order', 'z-index', 'font-weight', 'line-height', 'zoom'])

function enKebab(cle: string) {
  return cle.startsWith('--') ? cle : cle.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

function versCss(style: Style): string {
  if (!style) return ''
  if (typeof style === 'string') return style.trim().replace(/;?$/, style.trim() ? ';' : '')
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== '')
    .map(([cle, v]) => {
      const prop = enKebab(cle)
      const valeur = typeof v === 'number' && !prop.startsWith('--') && !SANS_UNITE.has(prop) ? `${v}px` : String(v)
      return `${prop}:${valeur};`
    })
    .join('')
}

/** Fusionne plusieurs styles ; le dernier l'emporte (le `style` de l'auteur) */
export function fusionnerStyles(...styles: Style[]): string | undefined {
  const css = styles.map(versCss).join('')
  return css || undefined
}

/** Accepte `class` (Astro) et `className` (contenu repris de React) */
export function classes(...valeurs: unknown[]): string | undefined {
  const liste = valeurs.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  return liste.length ? liste.join(' ') : undefined
}
