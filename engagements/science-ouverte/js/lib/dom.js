// Petits utilitaires DOM partagés par tous les modules.

export const root = document.documentElement;

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/** Texte lu par les lecteurs d’écran, invisible à l’écran. */
export function srText(text) {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}
