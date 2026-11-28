// Accessibilité : liens externes annoncés, pause des animations décoratives (WCAG 2.2.2),
// choix du thème clair ou sombre (WCAG 1.4.3 vérifié dans les deux thèmes).
import { $, $$, root, srText } from '../lib/dom.js';

export function announceNewTabLinks(scope = document) {
  for (const link of $$('a[target="_blank"]', scope)) {
    if (!link.querySelector('.sr-only')) link.append(srText(' (nouvel onglet)'));
  }
}

export function initMotionToggle() {
  const button = $('.motion-toggle');
  if (!button) return;
  const label = button.querySelector('.sr-only');
  button.addEventListener('click', () => {
    const paused = root.classList.toggle('motion-paused');
    button.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Relancer l’animation du fond' : 'Mettre en pause l’animation du fond';
  });
}

/** Bouton clair / sombre. Sans choix enregistré, le thème suit le système, y compris s’il change. */
export function initThemeToggle() {
  const button = $('.theme-toggle');
  if (!button) return;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ?? (systemDark.matches ? 'dark' : 'light')) === 'dark';
  const metas = $$('meta[name="theme-color"]');
  const sync = () => {
    const dark = isDark();
    button.setAttribute('aria-pressed', String(dark));
    // La barre du navigateur mobile suit le fond du haut de page, même quand le choix contredit le système.
    for (const meta of metas) meta.content = dark ? '#0b113a' : '#0057ac';
  };

  sync();
  systemDark.addEventListener('change', sync);
  button.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
    sync();
  });
}
