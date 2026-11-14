import{t as e}from"./pages.D7cJsQMg.js";var t=`
    :host { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.25rem 0.75rem; text-align: center; }
    .survey-title { margin: 0; }
    form { display: flex; flex-direction: column; align-items: center; }
    .radio-group { justify-content: center; margin: 0; }
  `;e(()=>customElements.whenDefined(`bib-retroaction-usager`).then(()=>{for(let e of document.querySelectorAll(`[data-retroaction]`)){let n=e.shadowRoot;if(!n||e.hasAttribute(`data-style-ajoute`))continue;e.setAttribute(`data-style-ajoute`,``);let r=new CSSStyleSheet;r.replaceSync(t),n.adoptedStyleSheets=[...n.adoptedStyleSheets,r]}}));