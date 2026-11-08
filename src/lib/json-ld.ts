/**
 * Données structurées (JSON-LD) prêtes pour un <script type="application/ld+json">.
 * JSON.stringify n'échappe pas « < » : un titre de nouvelle contenant
 * « </script> » fermerait la balise et casserait la page. On échappe donc
 * <, > et & en séquences \u…, que tout lecteur JSON relit à l'identique.
 */
export function jsonLd(donnees: unknown): string {
  return JSON.stringify(donnees).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}
