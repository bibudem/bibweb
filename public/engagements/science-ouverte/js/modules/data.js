// Chiffres de la page, lus depuis data/chiffres.json.
// Les valeurs écrites dans le HTML servent de repli (sans JavaScript, ou si le fichier est inaccessible).
import { $$ } from '../lib/dom.js';
import { formatNumber } from '../lib/format.js';

const SOURCE = new URL('../../data/chiffres.json', import.meta.url);

const decimalsOf = (n) => (Number.isInteger(n) ? 0 : String(n).split('.')[1].length);

function display(value, suffix) {
  if (typeof value !== 'number') return String(value);
  return formatNumber(value, decimalsOf(value)) + (suffix ? ` ${suffix}` : '');
}

export async function loadData() {
  let data;
  try {
    const response = await fetch(SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.warn('Chiffres : data/chiffres.json inaccessible, valeurs du HTML conservées.', error);
    return;
  }

  for (const el of $$('[data-donnee]')) {
    const key = el.dataset.donnee;

    if (key === 'mise_a_jour') {
      if (!data.mise_a_jour) continue;
      el.dateTime = data.mise_a_jour.date;
      el.textContent = data.mise_a_jour.libelle;
      continue;
    }

    if (key === 'edition') {
      if (data.edition) el.textContent = data.edition;
      continue;
    }

    const value = data.chiffres?.[key];
    if (value === undefined) {
      console.warn(`Chiffres : clé « ${key} » absente de data/chiffres.json.`);
      continue;
    }

    el.textContent = display(value, el.dataset.suffix);
  }
}
