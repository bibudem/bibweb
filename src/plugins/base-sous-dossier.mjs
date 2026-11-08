/*
 * Publication dans un sous-dossier (GitHub Pages : /bibweb/). Quand `base`
 * n'est pas « / », cette intégration préfixe, en fin de build, les adresses
 * « à la racine » écrites dans le contenu, les données et les composants
 * (/horaires/ devient /bibweb/horaires/), sans toucher aux sources :
 *
 * - pages HTML : attributs href, src, action, poster et srcset, et le
 *   « url=/… » des pages de redirection ;
 * - search-index.json : les adresses des résultats de la recherche.
 *
 * Les adresses déjà préfixées (fichiers d'Astro : /bibweb/_astro/…), les
 * adresses externes, « // » et les ancres seules (#…) restent telles quelles.
 * Le code qui fabrique une adresse dans le navigateur passe par avecBase()
 * (src/lib/chemin.ts).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default function baseSousDossier() {
  let base = ''
  return {
    name: 'base-sous-dossier',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.replace(/\/$/, '')
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!base) return
        const racine = fileURLToPath(dir)
        const prefixer = (adresse) => (adresse.startsWith('/') && !adresse.startsWith('//') && !adresse.startsWith(`${base}/`) && adresse !== base ? `${base}${adresse}` : adresse)
        let fichiers = 0
        for (const chemin of await lister(racine)) {
          if (!chemin.endsWith('.html') && !chemin.endsWith('search-index.json')) continue
          const avant = await readFile(chemin, 'utf8')
          let apres
          if (chemin.endsWith('.json')) {
            apres = avant.replace(/("url"\s*:\s*")([^"]*)"/g, (_, debut, adresse) => `${debut}${prefixer(adresse)}"`)
          } else {
            apres = avant
              .replace(/(\s(?:href|src|action|poster)=)(["'])(\/[^"']*)\2/g, (_, attribut, guillemet, adresse) => `${attribut}${guillemet}${prefixer(adresse)}${guillemet}`)
              .replace(/(\ssrcset=)(["'])([^"']*)\2/g, (_, attribut, guillemet, liste) => `${attribut}${guillemet}${liste.replace(/(^|,\s*)(\/[^\s,]+)/g, (__, sep, adresse) => `${sep}${prefixer(adresse)}`)}${guillemet}`)
              .replace(/(content=(["'])\d+;\s*url=)(\/[^"']*)\2/gi, (_, debut, guillemet, adresse) => `${debut}${prefixer(adresse)}${guillemet}`)
          }
          if (apres !== avant) {
            await writeFile(chemin, apres)
            fichiers++
          }
        }
        logger.info(`Liens préfixés par « ${base} » dans ${fichiers} fichiers`)
      },
    },
  }
}

async function lister(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true })
  const fichiers = await Promise.all(entrees.map((e) => (e.isDirectory() ? lister(join(dossier, e.name)) : [join(dossier, e.name)])))
  return fichiers.flat()
}
