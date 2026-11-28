// Effets liés au défilement : barre de progression, en-tête, chronologie, lien actif.
// Un seul écouteur passif, limité à une mise à jour par image.
import { $, $$, root } from '../lib/dom.js';
import { prefersReducedMotion } from '../lib/motion.js';

export function initScrollEffects() {
  const progress = $('.progress');
  const nav = $('.nav');
  const timeline = $('.timeline');
  const fill = $('.timeline-fill');
  const events = $$('.event');
  const dock = $('.dock');
  const manifeste = $('.manifeste');
  const mobile = matchMedia('(max-width: 720px)');
  // Sur mobile, la barre de sections reste toujours affichée.
  requestAnimationFrame(() => dock?.classList.add('visible'));
  const links = $$('.nav a.link, .dock a');
  const sections = [...new Set(links.map((a) => a.getAttribute('href')))].map((href) => $(href));
  let lastY = scrollY;
  let queued = false;

  const update = () => {
    queued = false;
    const y = scrollY;
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 8);
    // L’en-tête se range au défilement vers le bas sur ordinateur seulement : sur mobile, il reste en place.
    nav.classList.toggle('hidden', !mobile.matches && y > lastY && y > 400);
    lastY = y;

    const mark = innerHeight * 0.6;
    const box = timeline.getBoundingClientRect();
    if (!prefersReducedMotion()) {
      fill.style.transform = `scaleY(${Math.max(0, Math.min(1, (mark - box.top) / box.height))})`;
    }
    for (const ev of events) ev.classList.toggle('lit', ev.getBoundingClientRect().top + 14 < mark);

    // Manifeste : les mots s’allument dès que la section atteint le milieu de l’écran,
    // et sont tous allumés aux trois quarts de la course, pour laisser le temps de lire.
    if (manifeste) {
      const { top, height } = manifeste.getBoundingClientRect();
      const start = innerHeight * 0.5;
      const end = -(height - innerHeight) * 0.75;
      const p = end < start ? (start - top) / (start - end) : 1;
      manifeste.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
    }

    const current = sections.findLast((s) => s.getBoundingClientRect().top < innerHeight * 0.4);
    for (const a of links) {
      const active = a.getAttribute('href') === `#${current?.id}`;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    }
  };

  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}
