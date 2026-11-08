import type { APIRoute } from 'astro'

/*
 * robots.txt selon l'environnement (gatsby-plugin-robots-txt de
 * coquille-web). SITE_ENV est déduit de la branche git dans
 * astro.config.mjs (production → production, toute autre → preprod) et peut
 * être forcé au build.
 *
 * - production : tout est permis sauf /admin/ (Decap CMS) ;
 * - preprod (bib-pp) : rien n'est indexé, ni sitemap ni Host.
 */
export const GET: APIRoute = ({ site }) => {
  const racine = (site ?? new URL('https://bib.umontreal.ca')).origin
  const contenu =
    process.env.SITE_ENV === 'production'
      ? ['User-agent: *', 'Allow: /', 'Disallow: /admin/', `Sitemap: ${racine}/sitemap-index.xml`, `Host: ${racine}`]
      : ['User-agent: *', 'Disallow: /']
  return new Response(contenu.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
