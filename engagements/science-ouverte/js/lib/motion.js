// Préférences de mouvement et courbes d’animation.

const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

/** Lu à chaque appel : suit un changement de préférence sans recharger la page. */
export const prefersReducedMotion = () => reducedMotionQuery.matches;

export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Ressort physique échantillonné en courbe CSS linear().
 * response : temps de réponse perçu (s) — damping : 1 = sans rebond, < 1 = léger dépassement.
 * Retourne { easing, duration } directement utilisable par element.animate().
 */
export function spring(response, damping) {
  const w = (2 * Math.PI) / response;
  const z = damping;
  const settle = Math.min(1.1, -Math.log(0.0005) / (z * w));
  const wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
  const samples = 48;
  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const t = (settle * i) / samples;
    const x = z < 1
      ? 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
      : 1 - Math.exp(-w * t) * (1 + w * t);
    return +x.toFixed(4);
  });
  points[samples] = 1;
  return { easing: `linear(${points.join(', ')})`, duration: Math.round(settle * 1000) };
}

const supportsLinear = CSS.supports('transition-timing-function', 'linear(0, 1)');

/** Ouverture : départ immédiat, très léger dépassement. Fermeture : plus rapide, sans rebond. */
export const SPRING_OPEN = supportsLinear ? spring(0.5, 0.84) : { easing: EASE_DRAWER, duration: 600 };
export const SPRING_CLOSE = supportsLinear ? spring(0.38, 1) : { easing: EASE_DRAWER, duration: 400 };
