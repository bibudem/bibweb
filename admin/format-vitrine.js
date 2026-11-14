/*
 * Format YAML des vitrines pour Decap CMS (« yaml-vitrine »), enregistré par
 * index.html. Le format YAML de Decap retire les commentaires et les lignes
 * vides, et coupe les textes à 80 caractères : chaque enregistrement
 * réécrirait tout le fichier. Celui-ci écrit comme les fichiers à la main :
 *
 * - un texte d'une ligne reste sur une ligne, quelle que soit sa longueur ;
 * - un texte de plusieurs paragraphes s'écrit en bloc littéral (|) ;
 * - une ligne vide avant `banniere`, avant `sections` et entre deux sections ;
 * - le commentaire d'en-tête qui renvoie au guide de rédaction.
 *
 * Les autres commentaires du fichier sont perdus à l'enregistrement : les
 * notes de travail vont dans la documentation, pas dans les vitrines.
 *
 * `YAML` : la bibliothèque yaml (v2), passée par l'appelant pour que le
 * module serve aussi dans Node (scripts de vérification).
 */

const EN_TETE = '# Page vitrine : voir docs/REDACTION.md, section « Vitrines »\n'
const CLES_ESPACEES = ['banniere', 'sections']

export function formatVitrine(YAML) {
  return {
    fromFile: (contenu) => YAML.parse(contenu) ?? {},
    toFile: (donnees) => {
      const doc = new YAML.Document(donnees)
      for (const paire of doc.contents?.items ?? []) {
        if (CLES_ESPACEES.includes(String(paire.key?.value ?? paire.key))) paire.key.spaceBefore = true
        if (String(paire.key?.value ?? paire.key) === 'sections' && YAML.isSeq(paire.value)) {
          paire.value.items.forEach((section, i) => {
            if (i > 0) section.spaceBefore = true
          })
        }
      }
      return EN_TETE + doc.toString({ lineWidth: 0, blockQuote: 'literal' })
    },
  }
}
