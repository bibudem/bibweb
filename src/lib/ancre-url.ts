/**
 * Identifiant visé par l'ancre de l'adresse (#mon-volet), décodé. Une ancre
 * malformée (#100%, #a%zz) ferait lever une URIError à decodeURIComponent et
 * arrêterait le script qui la lit : on renvoie alors une chaîne vide.
 */
export function idDeLAncre(hash: string = location.hash): string {
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return ''
  }
}
