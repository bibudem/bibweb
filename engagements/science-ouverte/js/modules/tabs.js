// Onglets des quatre piliers (motif ARIA « tabs » avec tabulation itinérante).
import { $, $$ } from '../lib/dom.js';
import { prefersReducedMotion } from '../lib/motion.js';

export function initTabs() {
  const tabs = $$('.tab');
  const indicator = $('.tab-indicator');
  if (!tabs.length) return;

  const moveIndicator = (tab) => {
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.height = `${tab.offsetHeight}px`;
    // Ligne et colonne : la barre d’onglets passe en grille 2 × 2 sur mobile.
    indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  };

  const select = (tab, { focus = false } = {}) => {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('active', selected);
    }
    moveIndicator(tab);
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const targets = {
        ArrowRight: tabs[(i + 1) % tabs.length],
        ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs.at(-1),
      };
      const target = targets[event.key];
      if (!target) return;
      event.preventDefault();
      select(target, { focus: true });
    });
  });

  const sync = () => moveIndicator(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  new ResizeObserver(sync).observe($('.tabs'));
  document.fonts?.ready.then(sync);
  sync();
}
