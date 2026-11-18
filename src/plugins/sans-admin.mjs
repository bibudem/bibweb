/*
 * En production seulement (SITE_ENV=production) : retire /admin/ du site
 * construit. Decap CMS enregistre toujours dans main, quel que soit le site
 * d'où on l'ouvre : la pré-production (GitHub Pages) suffit, et le site
 * officiel n'a pas à exposer l'adresse de l'outil. Supprimer le dossier
 * après le build retire d'un coup public/admin/ (Decap et ses scripts) et
 * les routes générées de src/pages/admin/ (config.yml, connexion.html…).
 * Le dev (npm run cms:local) et la pré-production gardent /admin/.
 */
import { rm } from 'node:fs/promises'

export default function sansAdmin() {
  return {
    name: 'sans-admin',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.SITE_ENV !== 'production') return
        await rm(new URL('admin/', dir), { recursive: true, force: true })
        logger.info('/admin/ retiré du build de production')
      },
    },
  }
}
