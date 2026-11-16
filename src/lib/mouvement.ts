/*
 * Préférence « réduire les animations » du système : une seule définition
 * pour les scripts du site (elle était recopiée dans sept fichiers). Le CSS
 * utilise directement @media (prefers-reduced-motion: reduce).
 */
export const REQUETE_MOUVEMENT_REDUIT = '(prefers-reduced-motion: reduce)'

/** Vrai si la personne a demandé de limiter les animations (à lire au moment du mouvement) */
export const mouvementReduit = () => window.matchMedia(REQUETE_MOUVEMENT_REDUIT).matches
