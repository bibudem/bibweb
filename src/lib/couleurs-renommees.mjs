/*
 * Clés de couleur du contenu (noms Harmonium). Un ancien nom fait échouer le
 * build avec un renvoi vers le nouveau (directives.mjs, schema-vitrines.ts).
 * En JavaScript : importé aussi par le plugin des directives.
 */

/** Ancienne clé → clé Harmonium */
export const CLES_RENOMMEES = {
  bleu100: 'bleu10',
  bleu200: 'bleu20',
  rose100: 'rose50',
  rose300: 'rose',
  jaunePale: 'jaune40',
  vertPale: 'vert',
  bleu600: 'bleuPrincipalFonce',
  neutre700: 'gris700',
}

/** Clé → jeton de tokens.css, sans « -- » */
export const JETON_DE_CLE = {
  bleu10: 'bleu-10',
  bleu20: 'bleu-20',
  rose50: 'rose-50',
  rose: 'rose',
  jaune40: 'jaune-40',
  vert: 'vert',
  bleuPrincipalFonce: 'bleu-principal-fonce',
  gris700: 'gris-700',
}

/** Message pour une ancienne clé de couleur, ou null */
export function messageCleRenommee(valeur) {
  const nouvelle = CLES_RENOMMEES[valeur]
  return nouvelle ? `la couleur « ${valeur} » s’appelle maintenant « ${nouvelle} » (nom Harmonium).` : null
}
