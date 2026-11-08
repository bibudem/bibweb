import type { APIRoute } from 'astro'
import { SITE_TITRE } from '@/lib/site'

/*
 * Fenêtre de connexion GitHub de Decap CMS (/admin/connexion.html).
 *
 * Decap ouvre cette page (base_url + auth_endpoint de config.yml.ts) et
 * n'accepte le jeton que d'une fenêtre de la même origine que base_url. Le
 * relais n8n ne peut pas l'envoyer lui-même : n8n sert ses pages HTML en
 * bac à sable (Content-Security-Policy: sandbox), d'origine « null ».
 *
 * 1. Ouverte par Decap, sans fragment : la page passe au relais (DECAP_AUTH_URL)
 *    avec les paramètres de Decap, dont site_id, d'où le relais déduit
 *    l'adresse de retour.
 * 2. Le relais revient ici avec le message de Decap dans le fragment
 *    (#authorization:github:success:{…}), que le navigateur n'envoie à aucun
 *    serveur. La page l'efface de l'adresse, fait la poignée de main de Decap
 *    (authorizing:github) et lui transmet le message.
 */

export const prerender = true

const page = (relais: string) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Connexion | ${SITE_TITRE}</title>
</head>
<body>
<p id="etat">Connexion en cours…</p>
<script>
  (function () {
    var etat = document.getElementById('etat');
    var message = decodeURIComponent(location.hash.slice(1));
    if (!message) {
      var relais = ${JSON.stringify(relais)};
      if (relais) location.replace(relais + location.search);
      else etat.textContent = 'Relais de connexion non configuré (DECAP_AUTH_URL).';
      return;
    }
    // Le jeton ne reste ni dans l'adresse ni dans l'historique de la fenêtre
    history.replaceState(null, '', location.pathname);
    if (!window.opener || message.indexOf('authorization:github:') !== 0) {
      etat.textContent = 'Fenêtre ouverte hors de l’interface de rédaction. Fermez-la et recommencez.';
      return;
    }
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || e.source !== window.opener) return;
      window.opener.postMessage(message, location.origin);
      window.close();
    }, false);
    window.opener.postMessage('authorizing:github', location.origin);
  })();
</script>
</body>
</html>
`

export const GET: APIRoute = () =>
  new Response(page(process.env.DECAP_AUTH_URL ?? ''), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
