/*
 * Correctif d'affichage de <udem-urgence> (bibudem/ui 1.3.11, version figée
 * dans lib/site.ts), en attendant sa correction dans bibudem/ui.
 *
 * Le composant place la date en position absolue sur 127 px et décale le
 * message de 128 px : avec la police du site et la date en toutes lettres
 * (« 15 NOVEMBRE 2026 », 170 px), le début du message passait sous la date.
 * Le message est aussi limité à 48 px de haut, débordement masqué : sur un
 * téléphone, il était coupé après une ou deux lignes. Une alerte d'urgence
 * doit se lire en entier.
 *
 * La feuille ci-dessous est ajoutée à la racine fantôme (shadow DOM, ouverte)
 * du composant, après la sienne : date et message côte à côte dans une
 * rangée flexible, hauteurs selon le texte, date au-dessus du message sous
 * 600 px. En cas d'échec, le bandeau d'origine reste tel quel.
 */
const CSS = `
  .wrapper, .wrapper.big { height: auto; }
  .container, .big .container { height: auto; min-height: 48px; }
  .content, .big .content { height: auto; min-height: 48px; align-items: stretch; gap: 0; }
  .title, .big .title {
    align-self: center;
    margin: 0;
    max-height: none;
    overflow: visible;
    padding: 8px 12px;
    overflow-wrap: anywhere;
  }
  .datetime, .big .datetime {
    position: static;
    order: -1;
    flex: none;
    height: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .big .content { flex-direction: column; align-items: flex-start; }
  .big .title { align-self: flex-start; padding: 12px 0; }
  .big .datetime { order: 1; flex-direction: row; gap: 0.5em; line-height: 36px; }
  .big .datetime br { display: none; }
  @media (width < 600px) {
    .content, .big .content { flex-direction: column; align-items: stretch; padding: 0; }
    .datetime, .big .datetime { order: -1; flex-direction: row; justify-content: flex-start; gap: 0.5em; padding: 4px 15px; line-height: 17px; }
    .datetime br { display: none; }
    .title, .big .title { align-self: stretch; padding: 8px 15px 10px; font-size: 16px; }
  }
`

let feuille: CSSStyleSheet | undefined

export async function corrigerUrgence() {
  try {
    if (!('adoptedStyleSheets' in Document.prototype)) return
    await customElements.whenDefined('udem-urgence')
    feuille ??= new CSSStyleSheet()
    if (!feuille.cssRules.length) feuille.replaceSync(CSS)
    for (const urgence of document.querySelectorAll('udem-urgence')) {
      const racine = urgence.shadowRoot
      if (racine && !racine.adoptedStyleSheets.includes(feuille)) racine.adoptedStyleSheets = [...racine.adoptedStyleSheets, feuille]
    }
  } catch (erreur) {
    console.error('Correctif udem-urgence :', erreur)
  }
}
