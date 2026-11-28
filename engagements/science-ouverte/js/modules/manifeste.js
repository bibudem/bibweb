// Manifeste : découpe le texte en mots pour qu’ils s’allument un à un au défilement (voir scroll.js).
import { $, $$ } from '../lib/dom.js';

export function initManifeste() {
  const section = $('.manifeste');
  if (!section) return;
  let i = 0;
  for (const paragraph of $$('.manifeste-text', section)) {
    // Les lecteurs d’écran peuvent annoncer chaque <span> séparément : ils lisent une copie
    // intacte, invisible à l’écran, et la version découpée leur est masquée.
    const copy = paragraph.cloneNode(true);
    copy.className = 'sr-only';
    paragraph.before(copy);
    paragraph.setAttribute('aria-hidden', 'true');

    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parts = node.textContent.split(/(\s+)/).map((part) => {
        if (!part.trim()) return document.createTextNode(part);
        const word = document.createElement('span');
        word.className = 'w';
        word.style.setProperty('--i', i++);
        word.textContent = part;
        return word;
      });
      node.replaceWith(...parts);
    }
  }
  section.style.setProperty('--n', i);
}
