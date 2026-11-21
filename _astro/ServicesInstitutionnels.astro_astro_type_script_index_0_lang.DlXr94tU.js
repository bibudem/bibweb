import{t as e}from"./pages.D7cJsQMg.js";var t=`
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
`,n;async function r(){try{if(!(`adoptedStyleSheets`in Document.prototype))return;await customElements.whenDefined(`udem-urgence`),n??=new CSSStyleSheet,n.cssRules.length||n.replaceSync(t);for(let e of document.querySelectorAll(`udem-urgence`)){let t=e.shadowRoot;t&&!t.adoptedStyleSheets.includes(n)&&(t.adoptedStyleSheets=[...t.adoptedStyleSheets,n])}}catch(e){console.error(`Correctif udem-urgence :`,e)}}e(()=>void r());