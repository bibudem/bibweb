/*
 * Sémantique des tableaux, réglée au build sur le HTML du slot.
 *
 * MUI choisissait <th> ou <td> par un contexte React (TableHead) ; Astro n'a
 * pas de contexte entre composants. On rend donc le contenu, puis on change
 * les cellules d'en-tête en <th scope="col"> et on ajoute la portée aux <th>
 * écrits à la main qui n'en ont pas (scope="row" dans le corps).
 */

// Cellules des directives (pages .md), en <td data-cellule> jusque dans <thead>
const CELLULE_TD = /<td((?:\s[^>]*)?\sdata-cellule(?:[\s=][^>]*)?)>/g

/** Contenu de <thead> : toutes les cellules deviennent des en-têtes de colonne */
function entetesDeColonne(html: string): string {
  return ajouterPortee(
    html.replace(CELLULE_TD, (_, attributs: string) => `<th${attributs}>`).replace(/<\/td>/g, '</th>'),
    'col',
  )
}

/** Ajoute scope aux <th> qui n'en ont pas */
function ajouterPortee(html: string, portee: 'col' | 'row'): string {
  return html.replace(/<th(\s[^>]*)?>/g, (balise, attributs = '') => (/\sscope=/.test(attributs) ? balise : `<th scope="${portee}"${attributs}>`))
}

/** Tout le tableau : en-têtes de colonne dans <thead>, portée row ailleurs */
export function semantiqueTableau(html: string): string {
  return html.replace(/(<thead[\s>][\s\S]*?<\/thead>)|(<th(?:\s[^>]*)?>)/g, (bloc, entete: string | undefined) =>
    entete ? entetesDeColonne(entete) : ajouterPortee(bloc, 'row'),
  )
}
