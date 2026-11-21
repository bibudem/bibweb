// Piliers : chaque carte de thème devient une tuile compacte.
// Les cartes complètes restent dans le HTML (amélioration progressive) : sans JavaScript, elles s’affichent telles quelles.
import { $$ } from '../lib/dom.js';

const ARROW = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function createTile(card, index) {
  const kpi = card.dataset.tile === 'text' ? null : card.querySelector('.kpi');
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'tile';
  tile.style.setProperty('--i', index);
  tile.setAttribute('aria-haspopup', 'dialog');

  tile.append(card.querySelector('.icon').cloneNode(true));

  const title = document.createElement('span');
  title.className = 'tile-title';
  title.textContent = card.querySelector('.card-title').textContent;
  tile.append(title);

  if (kpi) {
    const highlight = document.createElement('span');
    highlight.className = 'tile-kpi';
    const value = document.createElement('b');
    value.innerHTML = kpi.querySelector('b').innerHTML;
    const label = document.createElement('span');
    label.textContent = kpi.querySelector('span').textContent;
    highlight.append(value, label);
    tile.append(highlight);
  } else {
    const desc = document.createElement('span');
    desc.className = 'tile-desc';
    desc.textContent = card.querySelector('.item p').textContent;
    tile.append(desc);
  }

  const meta = document.createElement('span');
  meta.className = 'tile-meta';
  meta.innerHTML = `<span class="tile-go">${ARROW}</span>`;
  tile.append(meta);
  return tile;
}

/**
 * Construit les tuiles de chaque pilier.
 * onOpen({ entry, group, keyboard }) est appelé au clic ; group contient les thèmes du pilier, dans l’ordre.
 */
export function buildTiles({ onOpen }) {
  for (const panel of $$('.panel')) {
    const pilier = panel.querySelector('h3').textContent;
    const group = [];

    for (const cards of $$('.cards', panel)) {
      const bento = document.createElement('div');
      bento.className = 'bento';
      $$('.card', cards).forEach((card, i) => {
        const tile = createTile(card, i);
        const entry = { tile, card, pilier, panel };
        // detail vaut 0 quand le clic vient du clavier (Entrée, Espace).
        tile.addEventListener('click', (event) => onOpen({ entry, group, keyboard: event.detail === 0 }));
        group.push(entry);
        bento.append(tile);
      });
      cards.after(bento);
      cards.hidden = true;
    }
  }
}
