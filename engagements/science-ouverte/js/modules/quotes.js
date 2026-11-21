// Citations de l’UNESCO repliées sur deux lignes, avec un bouton pour lire la définition complète.
import { $$ } from '../lib/dom.js';

const LABELS = { closed: 'Lire la définition complète', open: 'Réduire la définition' };

export function initQuotes() {
  $$('.panel .quote').forEach((quote, i) => {
    const text = quote.querySelector('p');
    text.id ||= `quote-text-${i + 1}`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'quote-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', text.id);
    toggle.innerHTML = `<span>${LABELS.closed}</span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    toggle.addEventListener('click', () => {
      const expanded = quote.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.querySelector('span').textContent = expanded ? LABELS.open : LABELS.closed;
    });

    quote.classList.add('is-collapsible');
    text.after(toggle);
  });
}
