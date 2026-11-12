// Point d’entrée : chaque module s’occupe d’une seule responsabilité.
import { announceNewTabLinks, initMotionToggle, initThemeToggle } from './modules/a11y.js';
import { initReveal } from './modules/reveal.js';
import { loadData } from './modules/data.js';
import { initTabs } from './modules/tabs.js';
import { initScrollEffects } from './modules/scroll.js';
import { buildTiles } from './modules/piliers.js';
import { initQuotes } from './modules/quotes.js';
import { createSheet } from './modules/sheet.js';
import { initManifeste } from './modules/manifeste.js';

announceNewTabLinks();
initMotionToggle();
initThemeToggle();
initReveal();
initTabs();
initQuotes();
initManifeste();
initScrollEffects();

// Les chiffres doivent être chargés avant la copie dans les tuiles.
await loadData();

const sheet = createSheet();
buildTiles({ onOpen: sheet.open });
