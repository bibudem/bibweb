/*
 * Constantes du site, en un seul endroit : nom affiché dans les titres et le
 * partage, nom de l'organisation (données structurées), description par
 * défaut, adresse des composants institutionnels bibudem/ui.
 */

/** Ajouté aux titres d'onglet (« Horaires | Les bibliothèques UdeM ») et nom du site au partage */
export const SITE_TITRE = 'Les bibliothèques UdeM'

/** Nom complet du site : h1 de l'accueil, titre du pied de page */
export const NOM_SITE = "Les bibliothèques de l'Université de Montréal"

/** Nom de l'organisation (données structurées, éditeur des nouvelles) */
export const NOM_ORGANISATION = "Bibliothèques de l'Université de Montréal"

/** Description d'une page qui n'en a pas et dont le texte n'en fournit pas */
export const SITE_DESCRIPTION = "Site Web des Bibliothèques de l'Université de Montréal"

/**
 * Web components institutionnels (avis, urgence, rétroaction), version
 * exacte : avec @1, une nouvelle version publiée dans bibudem/ui partait en
 * production sans passer par ce dépôt. Pour monter de version : changer
 * VERSION_BIBUDEM et recalculer chaque empreinte (SRI) :
 *   curl -s <CDN_BIBUDEM>/<fichier> | openssl dgst -sha384 -binary | openssl base64 -A
 * Les modules que ces fichiers importent (lit-element…) sont résolus dans la
 * même version figée.
 */
const VERSION_BIBUDEM = '1.3.11'
export const CDN_BIBUDEM = `https://cdn.jsdelivr.net/gh/bibudem/ui@${VERSION_BIBUDEM}/dist`
export const SRI_BIBUDEM: Record<string, string> = {
  'udem-urgence.min.js': 'sha384-nAThtqM3ZzCJloFRZJXNT9BaPsHhRiF3hVLwArD4MFIWJt685tw27YBSQItLXg/l',
  'bib-avis.min.js': 'sha384-hT0emzD74ryY2SJ6C9mfIiPJB7cX+MoKXw4hZfc8a9YWA6wJXYQNXopqxvaIkLUr',
  'bib-retroaction-usager.js': 'sha384-3m9bJJ6o8JxFX/UpcKiNVDJ4YrsF7vmwqDmyz/zgpa1FrBQLWgJgH7BlfgAytaoT',
}
