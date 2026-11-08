import { defineMiddleware } from 'astro:middleware'
import { planche } from '@/lib/sprite'

/*
 * Écrit la planche d'icônes (src/lib/sprite.ts) avant </body>, une fois la
 * page entièrement rendue : c'est le seul moment où tous les composants ont
 * enregistré leurs symboles. Pages statiques : s'exécute au build.
 */
export const onRequest = defineMiddleware(async (contexte, suivant) => {
  const reponse = await suivant()
  if (!reponse.headers.get('content-type')?.includes('text/html')) return reponse
  const html = await reponse.text()
  const fin = html.lastIndexOf('</body>')
  const svg = fin < 0 ? '' : planche(contexte.locals, html)
  if (!svg) return new Response(html, reponse)
  const entetes = new Headers(reponse.headers)
  entetes.delete('content-length')
  return new Response(html.slice(0, fin) + svg + html.slice(fin), { status: reponse.status, statusText: reponse.statusText, headers: entetes })
})
