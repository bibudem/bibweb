/*
 * En dev seulement : sert l'index.html des sites autonomes de public/
 * (/ddia/, /radaria/, /engagements/science-ouverte/…) à l'adresse de leur
 * dossier. Le serveur de dev ne le fait pas de lui-même (404 sur /ddia/,
 * alors que /ddia/index.html répond) ; le build et le serveur de production,
 * eux, servent déjà …/index.html pour …/.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default function indexPublic() {
  return {
    name: 'index-public',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const racine = fileURLToPath(new URL('../../public/', import.meta.url))
        server.middlewares.use((req, _res, next) => {
          const [chemin, requete] = (req.url ?? '').split(/(?=\?)/)
          if (chemin.endsWith('/') && chemin !== '/' && existsSync(join(racine, decodeURIComponent(chemin), 'index.html'))) {
            req.url = `${chemin}index.html${requete ?? ''}`
          }
          next()
        })
      },
    },
  }
}
