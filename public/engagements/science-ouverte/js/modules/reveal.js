// Apparition des éléments au défilement (l’entrée du haut de page est en CSS pur : css/motion.css).
import { $$ } from '../lib/dom.js';

export function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  for (const el of $$('.reveal, .reveal-bleed, .photo-reveal')) observer.observe(el);
}
