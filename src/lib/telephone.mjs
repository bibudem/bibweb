/*
 * Lien tel: à partir d'un numéro écrit comme on l'affiche (« 514 343-6111,
 * poste 3585 », « 514 343-2135 »). Le poste devient une pause de
 * numérotation (« , ») : le téléphone compose le numéro, attend, puis le
 * poste. Partagé par le répertoire du personnel, les volets des vitrines et
 * les fiches de /horaires/ (qui avaient chacun leur version, avec des
 * résultats différents). En JavaScript simple : importable par les tests Node.
 */

/** `tel:+15143436111,3585`, ou undefined si le texte ne contient pas de numéro complet */
export function lienTelephone(texte) {
  const [principal, poste] = String(texte).split(/,?\s*(?:poste|p\.|ext\.?|#)\s*/i)
  let chiffres = principal.replace(/\D/g, '')
  if (chiffres.length === 10) chiffres = `1${chiffres}`
  if (chiffres.length !== 11) return undefined
  const extension = poste?.replace(/\D/g, '')
  return `tel:+${chiffres}${extension ? `,${extension}` : ''}`
}
