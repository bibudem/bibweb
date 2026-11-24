/*
 * Tableau de bord de l'interface de rédaction (#/accueil) : page d'arrivée
 * après la connexion, et lien du logo de l'en-tête.
 *
 * Decap n'a pas de pages personnalisées : sur une adresse qu'il ne connaît
 * pas, il affiche son en-tête et « Introuvable » dans AppMainContainer. Le
 * tableau de bord prend la place de ce message (même technique que la liste
 * des pages, ordre-pages.js).
 *
 * Contenu : la personne connectée (session de Decap : nom, compte et avatar
 * GitHub ; en local, mode fichiers du poste), les chiffres du site
 * (tableau-de-bord.json et medias.json, générés au build), les dernières
 * nouvelles, des raccourcis et, en ligne, les dernières modifications
 * publiées (commits de la branche, API GitHub avec la session de Decap).
 */

const ROUTE = '#/accueil'

const STYLE = `
body[data-accueil] [class*='-AppMainContainer'] > :not(#accueil) { display: none !important; }
#accueil { max-width: 1104px; margin: 24px auto 48px; padding: 0 16px; color: var(--couleur-texte, #0b113a); font-family: var(--police-sans, sans-serif); font-size: 14px; }
#accueil h1 { margin: 0 0 16px; font-size: var(--texte-tres-grand, 1.5rem); font-weight: var(--graisse-forte, 600); }
#accueil h2 { margin: 0 0 12px; font-family: var(--police-serif, Georgia, serif); font-size: 1.25rem; font-weight: var(--graisse-normale, 400); }
#accueil a { color: var(--couleur-lien, #0057ac); }
#accueil a:hover { color: var(--couleur-lien-survol, #003c78); }
#accueil :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 2px; }
.ac-carte { padding: 20px 24px; background: var(--couleur-surface, #fff); border-radius: var(--rayon-carte, 12px); box-shadow: var(--ombre-1); }
.ac-grille { display: grid; gap: 16px; }
.ac-profil { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px; margin-bottom: 16px; }
.ac-avatar { flex: none; width: 64px; height: 64px; border-radius: var(--rayon-plein, 9999px); background: var(--couleur-teinte-forte, #cce2f3); color: var(--bleu-fonce, #0b113a); display: grid; place-items: center; font-size: 26px; font-weight: var(--graisse-forte, 600); object-fit: cover; }
.ac-profil-texte { flex: 1 1 280px; }
.ac-bonjour { margin: 0 0 4px; font-size: var(--texte-grand, 1.25rem); font-weight: var(--graisse-forte, 600); }
.ac-sous { margin: 0; color: var(--couleur-texte-secondaire, #4a5160); line-height: 1.5; }
.ac-bouton { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 18px; border: 2px solid var(--couleur-fond-fort, #0b113a); border-radius: var(--rayon-plein, 9999px); background: var(--couleur-surface, #fff); color: var(--couleur-fond-fort, #0b113a) !important; font: inherit; font-weight: var(--graisse-forte, 600); text-decoration: none; cursor: pointer; white-space: nowrap; }
.ac-bouton:hover { background: var(--couleur-teinte, #e5eef7); }
.ac-bouton.ac-plein { background: var(--couleur-fond-fort, #0b113a); color: var(--couleur-sur-fonce, #fff) !important; }
.ac-bouton.ac-plein:hover { border-color: var(--couleur-fond-fort-survol, #0057ac); background: var(--couleur-fond-fort-survol, #0057ac); }
/* Grille commune : 4 tuiles au-dessus de 2 colonnes, même écart, bords alignés */
.ac-chiffres { grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 0 16px; padding: 0; list-style: none; }
.ac-chiffres > li { display: flex; }
.ac-chiffres > li > * { flex: 1; }
.ac-chiffre { display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; background: var(--couleur-surface, #fff); border: 0; border-radius: var(--rayon-carte, 12px); box-shadow: var(--ombre-1); color: var(--couleur-texte, #0b113a) !important; font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.ac-chiffre:hover { box-shadow: var(--ombre-2); }
.ac-chiffre:hover .ac-libelle { color: var(--couleur-lien, #0057ac); }
.ac-libelle { color: var(--couleur-texte-secondaire, #4a5160); font-size: 12px; font-weight: var(--graisse-grasse, 700); letter-spacing: .04em; text-transform: uppercase; }
.ac-nombre { font-size: 2.25rem; font-weight: var(--graisse-forte, 600); line-height: 1.1; font-variant-numeric: tabular-nums; }
.ac-detail { color: var(--couleur-texte-secondaire, #4a5160); font-size: 13px; }
.ac-detail.ac-alerte { color: var(--couleur-texte-accent, #a83719); }
.ac-colonnes { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
.ac-colonnes > .ac-carte { display: flex; flex-direction: column; }
#accueil > .ac-raccourcis-carte { margin-bottom: 16px; }
.ac-colonnes .ac-lien-tout { margin-top: auto; padding-top: 12px; }
@media (max-width: 900px) {
  .ac-chiffres { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ac-colonnes { grid-template-columns: minmax(0, 1fr); }
  .ac-groupes { grid-template-columns: minmax(0, 1fr); }
}
.ac-liste { margin: 0; padding: 0; list-style: none; }
.ac-liste li { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid var(--couleur-teinte, #e5eef7); line-height: 1.4; }
.ac-liste li:first-child { border-top: 0; padding-top: 0; }
.ac-date { flex: none; min-width: 6.5em; color: var(--couleur-texte-secondaire, #4a5160); font-variant-numeric: tabular-nums; }
.ac-qui { color: var(--couleur-texte-secondaire, #4a5160); font-size: 13px; }
.ac-groupes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px 20px; }
.ac-groupe-titre { margin: 0 0 8px; color: var(--couleur-texte-secondaire, #4a5160); font-family: var(--police-sans, sans-serif); font-size: 12px; font-weight: var(--graisse-grasse, 700); letter-spacing: .04em; text-transform: uppercase; }
.ac-tuiles { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.ac-tuiles > li { display: flex; }
.ac-tuile { flex: 1; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--couleur-teinte, #e5eef7); border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-surface, #fff); color: var(--couleur-texte, #0b113a) !important; font: inherit; text-align: left; text-decoration: none; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
.ac-tuile:hover { border-color: var(--couleur-accent, #0057ac); box-shadow: var(--ombre-1); transform: translateY(-1px); }
.ac-tuile-icone { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-teinte, #e5eef7); color: var(--couleur-accent, #0057ac); }
.ac-tuile-icone svg { width: 22px; height: 22px; fill: currentColor; }
.ac-creer .ac-tuile-icone { background: var(--couleur-fond-fort, #0b113a); color: var(--couleur-sur-fonce, #fff); }
.ac-tuile:hover .ac-tuile-icone { background: var(--couleur-accent, #0057ac); color: var(--couleur-sur-fonce, #fff); }
.ac-tuile-texte { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ac-tuile-titre { font-weight: var(--graisse-forte, 600); line-height: 1.3; }
.ac-tuile-aide { color: var(--couleur-texte-secondaire, #4a5160); font-size: 12.5px; line-height: 1.35; }
.ac-tuile-fin { flex: none; width: 16px; height: 16px; color: var(--couleur-contour, #7d8696); fill: currentColor; }
.ac-tuile:hover .ac-tuile-fin { color: var(--couleur-accent, #0057ac); }
@media (prefers-reduced-motion: reduce) { .ac-tuile { transition: none; } .ac-tuile:hover { transform: none; } }
.ac-note { margin: 0; color: var(--couleur-texte-secondaire, #4a5160); line-height: 1.5; }
.ac-pied { margin: 16px 0 0; color: var(--couleur-texte-secondaire, #4a5160); font-size: 12px; }
.ac-carte > .ac-lien-tout { align-self: flex-start; font-weight: var(--graisse-forte, 600); }
.ac-avatar svg { width: 34px; height: 34px; fill: currentColor; }
/* Logo de l'en-tête : lien vers le tableau de bord */
[class*='-AppHeaderLogo'] { position: relative; }
.ac-logo { position: absolute; inset: 0; border-radius: var(--rayon-minuscule, 4px); }
.ac-logo:focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 2px; }
`

// Icône Phosphor « user » (256 × 256), avatar sans photo
const SILHOUETTE = '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8ZM72 96a56 56 0 1 1 56 56 56.06 56.06 0 0 1-56-56Z"/></svg>'

// Icônes des raccourcis : Phosphor (regular, 256 × 256)
const TRACES = {
  nouvelle: 'M88,112a8,8,0,0,1,8-8h80a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm8,40h80a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16ZM232,64V184a24,24,0,0,1-24,24H32A24,24,0,0,1,8,184.11V88a8,8,0,0,1,16,0v96a8,8,0,0,0,16,0V64A16,16,0,0,1,56,48H216A16,16,0,0,1,232,64Zm-16,0H56V184a23.84,23.84,0,0,1-1.37,8H208a8,8,0,0,0,8-8Z',
  page: 'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-40-64a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V160H104a8,8,0,0,1,0-16h16V128a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,152Z',
  menu: 'M160,112h48a16,16,0,0,0,16-16V48a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16V64H128a24,24,0,0,0-24,24v32H72v-8A16,16,0,0,0,56,96H24A16,16,0,0,0,8,112v32a16,16,0,0,0,16,16H56a16,16,0,0,0,16-16v-8h32v32a24,24,0,0,0,24,24h16v16a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V160a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16v16H128a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8h16V96A16,16,0,0,0,160,112ZM56,144H24V112H56v32Zm104,16h48v48H160Zm0-112h48V96H160Z',
  images: 'M216,40H72A16,16,0,0,0,56,56V72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V184h16a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM72,56H216v62.75l-10.07-10.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L72,109.37ZM184,200H40V88H56v80a16,16,0,0,0,16,16H184Zm32-32H72V132l36-36,49.66,49.66a8,8,0,0,0,11.31,0L194.63,120,216,141.38V168ZM160,84a12,12,0,1,1,12,12A12,12,0,0,1,160,84Z',
  couleurs: 'M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z',
  site: 'M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z',
  contenus: 'M213.66,66.34l-40-40A8,8,0,0,0,168,24H88A16,16,0,0,0,72,40V56H56A16,16,0,0,0,40,72V216a16,16,0,0,0,16,16H168a16,16,0,0,0,16-16V200h16a16,16,0,0,0,16-16V72A8,8,0,0,0,213.66,66.34ZM168,216H56V72h76.69L168,107.31v84.53c0,.06,0,.11,0,.16s0,.1,0,.16V216Zm32-32H184V104a8,8,0,0,0-2.34-5.66l-40-40A8,8,0,0,0,136,56H88V40h76.69L200,75.31Zm-56-32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h48A8,8,0,0,1,144,152Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h48A8,8,0,0,1,144,184Z',
  composants: 'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
  externe: 'M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z',
  suite: 'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z',
}
const icone = (nom) => `<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${TRACES[nom]}"/></svg>`

const nombre = (n) => new Intl.NumberFormat('fr-CA').format(n)
const dateLongue = (d) => new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
const relatif = new Intl.RelativeTimeFormat('fr-CA', { numeric: 'auto' })
function ilYa(iso) {
  const secondes = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unite, s] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(secondes) >= s) return relatif.format(Math.round(secondes / s), unite)
  }
  return 'à l’instant'
}

function element(balise, attributs = {}, ...enfants) {
  const el = document.createElement(balise)
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === false || valeur == null) continue
    if (cle === 'class') el.className = valeur
    else if (cle === 'texte') el.textContent = valeur
    else el.setAttribute(cle, valeur === true ? '' : valeur)
  }
  el.append(...enfants.filter((e) => e != null && e !== false))
  return el
}

const lireJson = async (url) => {
  try {
    const reponse = await fetch(url)
    return reponse.ok ? await reponse.json() : null
  } catch {
    return null
  }
}

function utilisateur() {
  try {
    return JSON.parse(localStorage.getItem('decap-cms-user') || 'null') ?? {}
  } catch {
    return {}
  }
}

/** Ouvre la médiathèque (bouton « Media » de l'en-tête, intercepté par medias.js) */
const ouvrirMediatheque = () => document.querySelector('header button[class*="-AppHeaderButton"]')?.click()

/** Dernières modifications publiées : commits de la branche (en ligne seulement) */
async function activite(config, jeton) {
  const backend = config?.backend
  if (!backend?.repo || !jeton) return null
  const api = `${(backend.api_root || 'https://api.github.com').replace(/\/$/, '')}/repos/${backend.repo}/commits?sha=${encodeURIComponent(backend.branch || 'main')}&per_page=6`
  try {
    const reponse = await fetch(api, { headers: { Authorization: `token ${jeton}`, Accept: 'application/vnd.github+json' } })
    if (!reponse.ok) return null
    return (await reponse.json()).map((c) => ({
      message: c.commit.message.split('\n')[0],
      auteur: c.commit.author?.name ?? c.author?.login ?? '',
      date: c.commit.author?.date,
      url: c.html_url,
    }))
  } catch {
    return null
  }
}

async function construire() {
  const [chiffres, medias, config] = await Promise.all([lireJson('./tableau-de-bord.json'), lireJson('./medias.json'), lireJson('./config.yml')])
  const user = utilisateur()
  const local = user.backendName === 'proxy' || !user.token
  const racine = new URL('../', location.href.replace(/#.*$/, '')).href
  const prenom = (user.name || '').trim().split(/\s+/)[0]

  // Personne connectée
  const avatar = user.avatar_url
    ? element('img', { class: 'ac-avatar', src: user.avatar_url, alt: '' })
    : element('span', { class: 'ac-avatar', 'aria-hidden': 'true', texte: prenom || user.login ? (prenom || user.login).charAt(0).toUpperCase() : null })
  if (!user.avatar_url && !(prenom || user.login)) avatar.innerHTML = SILHOUETTE
  const profil = element(
    'section',
    { class: 'ac-carte ac-profil', 'aria-labelledby': 'ac-bonjour' },
    avatar,
    element(
      'div',
      { class: 'ac-profil-texte' },
      element('p', { class: 'ac-bonjour', id: 'ac-bonjour', texte: prenom ? `Bonjour, ${prenom}` : 'Bonjour' }),
      element(
        'p',
        { class: 'ac-sous' },
        local
          ? 'Mode local : les modifications sont écrites directement dans les fichiers du poste.'
          : `Connexion GitHub${user.login ? ` : @${user.login}` : ''} · dépôt ${config?.backend?.repo ?? ''}, branche ${config?.backend?.branch ?? 'main'}. Chaque enregistrement est publié en préproduction après la reconstruction du site.`,
      ),
      element('p', { class: 'ac-sous', texte: dateLongue(new Date()).replace(/^./, (c) => c.toUpperCase()) }),
    ),
    element('a', { class: 'ac-bouton', href: racine, target: '_blank', rel: 'noopener' }, 'Voir le site ', element('span', { 'aria-hidden': 'true', texte: '↗' })),
  )

  // Chiffres
  const libres = medias?.images?.filter((i) => !i.utilisations.length).length ?? 0
  const tuile = (balise, attributs, valeur, libelle, detail, alerte = false) =>
    element(
      balise,
      { class: 'ac-chiffre', ...attributs },
      element('span', { class: 'ac-libelle', texte: libelle }),
      element('span', { class: 'ac-nombre', texte: valeur == null ? '–' : nombre(valeur) }),
      detail ? element('span', { class: `ac-detail${alerte ? ' ac-alerte' : ''}`, texte: detail }) : null,
    )
  const boutonImages = tuile('button', { type: 'button' }, medias?.images?.length, 'Images', libres ? `${nombre(libres)} non utilisées` : 'Toutes utilisées', libres > 0)
  boutonImages.addEventListener('click', ouvrirMediatheque)
  const tuiles = element(
    'ul',
    { class: 'ac-grille ac-chiffres', 'aria-label': 'Chiffres du site' },
    ...[
      tuile('a', { href: '#/collections/pages' }, chiffres?.pages.total, 'Pages', chiffres ? `${chiffres.pages.sections} sections` : null),
      tuile('a', { href: '#/collections/nouvelles' }, chiffres?.nouvelles.total, 'Nouvelles', chiffres ? `${chiffres.nouvelles.cetteAnnee} en ${chiffres.nouvelles.annee}` : null),
      boutonImages,
      tuile('a', { href: '#/collections/revue-de-presse/entries/articles' }, chiffres?.articles.total, 'Revue de presse', chiffres ? `${chiffres.articles.cetteAnnee} en ${chiffres.nouvelles.annee}` : null),
    ].map((t) => element('li', {}, t)),
  )

  // Dernières nouvelles
  const nouvelles = element(
    'section',
    { class: 'ac-carte ac-nouvelles', 'aria-labelledby': 'ac-nouvelles' },
    element('h2', { id: 'ac-nouvelles', texte: 'Dernières nouvelles' }),
    chiffres?.nouvelles.dernieres.length
      ? element('ul', { class: 'ac-liste' }, ...chiffres.nouvelles.dernieres.map((n) => element('li', {}, element('span', { class: 'ac-date', texte: n.date }), element('a', { href: n.entree, texte: n.titre }))))
      : element('p', { class: 'ac-note', texte: 'Aucune nouvelle.' }),
    element('a', { class: 'ac-lien-tout', href: '#/collections/nouvelles', texte: 'Toutes les nouvelles' }),
  )

  // Raccourcis : tuiles d'action par groupe
  const tuileAction = ({ titre, aide, icone: nom, href, externe, action }) => {
    const contenu = [
      element('span', { class: 'ac-tuile-icone' }),
      element('span', { class: 'ac-tuile-texte' }, element('span', { class: 'ac-tuile-titre', texte: titre }), element('span', { class: 'ac-tuile-aide', texte: aide })),
      element('span', { class: 'ac-tuile-fin' }),
    ]
    const lien = action
      ? element('button', { type: 'button', class: 'ac-tuile' }, ...contenu)
      : element('a', { class: 'ac-tuile', href, ...(externe ? { target: '_blank', rel: 'noopener', 'aria-label': `${titre} (nouvel onglet)` } : {}) }, ...contenu)
    lien.querySelector('.ac-tuile-icone').innerHTML = icone(nom)
    lien.querySelector('.ac-tuile-fin').innerHTML = icone(externe ? 'externe' : 'suite')
    if (action) lien.addEventListener('click', action)
    return element('li', {}, lien)
  }
  const groupe = (titre, classe, tuiles) =>
    element('div', { class: `ac-groupe ${classe}`, role: 'group', 'aria-label': titre }, element('h3', { class: 'ac-groupe-titre', 'aria-hidden': 'true', texte: titre }), element('ul', { class: 'ac-tuiles' }, ...tuiles.map(tuileAction)))
  const raccourcis = element(
    'section',
    { class: 'ac-carte ac-raccourcis-carte', 'aria-labelledby': 'ac-raccourcis' },
    element('h2', { id: 'ac-raccourcis', texte: 'Raccourcis' }),
    element('div', { class: 'ac-groupes' },
    groupe('Créer', 'ac-creer', [
      { titre: 'Nouvelle', aide: 'Annoncer une actualité', icone: 'nouvelle', href: '#/collections/nouvelles/new' },
      { titre: 'Page', aide: 'Ajouter une page au site', icone: 'page', href: '#/collections/pages/new' },
    ]),
    groupe('Gérer', 'ac-gerer', [
      { titre: 'Contenus', aide: 'Toutes les collections', icone: 'contenus', href: '#/collections/nouvelles' },
      { titre: 'Pages et menu', aide: 'Arborescence, ordre du menu', icone: 'menu', href: '#/collections/pages' },
      { titre: 'Médiathèque', aide: 'Images du site, import', icone: 'images', action: ouvrirMediatheque },
    ]),
    groupe('Ressources', 'ac-ressources', [
      { titre: 'Couleurs Harmonium', aide: 'Palette et jetons de couleur', icone: 'couleurs', href: 'https://bibudem.github.io/harmonium/fondations/couleurs.html', externe: true },
      { titre: 'Composants Harmonium', aide: 'Système de design des Bibliothèques', icone: 'composants', href: 'https://bibudem.github.io/harmonium/composants/index.html', externe: true },
    ]),
    ),
  )

  // Activité récente (en ligne)
  const activiteCarte = element('section', { class: 'ac-carte', 'aria-labelledby': 'ac-activite' }, element('h2', { id: 'ac-activite', texte: 'Dernières modifications' }))
  if (local) {
    activiteCarte.append(element('p', { class: 'ac-note', texte: 'En local, les modifications ne sont pas publiées : l’historique s’affiche dans l’interface en ligne.' }))
  } else {
    const attente = element('p', { class: 'ac-note', texte: 'Chargement…' })
    activiteCarte.append(attente)
    activite(config, user.token).then((liste) => {
      attente.replaceWith(
        liste?.length
          ? element(
              'ul',
              { class: 'ac-liste' },
              ...liste.map((c) => element('li', {}, element('span', { class: 'ac-date', title: c.date, texte: ilYa(c.date) }), element('span', {}, element('a', { href: c.url, target: '_blank', rel: 'noopener', texte: c.message }), element('br'), element('span', { class: 'ac-qui', texte: c.auteur })))),
            )
          : element('p', { class: 'ac-note', texte: 'Historique indisponible pour le moment.' }),
      )
    })
  }

  return element(
    'div',
    { id: 'accueil' },
    element('h1', { texte: 'Tableau de bord' }),
    profil,
    tuiles,
    raccourcis,
    element('div', { class: 'ac-grille ac-colonnes' }, nouvelles, activiteCarte),
    chiffres ? element('p', { class: 'ac-pied', texte: `Chiffres du dernier build : ${new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(chiffres.genereLe))}.` }) : null,
  )
}

export function installerAccueil() {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.append(style)

  // Arrivée sur l'interface (et après la connexion) : le tableau de bord, pas
  // la première collection
  if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', ROUTE)
  // Après la connexion, Decap renvoie vers la première collection : si
  // l'arrivée visait le tableau de bord, ce premier renvoi est annulé (une
  // seule fois, dans les 3 s qui suivent l'affichage de l'interface)
  let retour = location.hash === ROUTE
  let interfaceVueA = 0
  // Un clic ou une touche dans l'interface : c'est la personne qui navigue
  // (« Contenus » vise aussi la première collection), plus de retour automatique
  for (const type of ['pointerdown', 'keydown']) {
    addEventListener(type, () => {
      if (interfaceVueA) retour = false
    }, true)
  }

  let vue = null
  let enConstruction = false

  async function synchroniser() {
    if (!interfaceVueA && document.querySelector('header[class*="-AppHeader"]')) interfaceVueA = Date.now()
    // Logo de l'en-tête : lien vers le tableau de bord
    const logo = document.querySelector('[class*="-AppHeaderLogo"]')
    if (logo && !logo.querySelector('.ac-logo')) logo.append(element('a', { class: 'ac-logo', href: ROUTE, 'aria-label': 'Tableau de bord', title: 'Tableau de bord' }))

    const actif = location.hash.replace(/\?.*$/, '') === ROUTE

    const conteneur = document.querySelector('[class*="-AppMainContainer"]')
    if (!actif || !conteneur) {
      delete document.body.dataset.accueil
      vue?.remove()
      return
    }
    document.body.dataset.accueil = ''
    if (!vue && !enConstruction) {
      enConstruction = true
      vue = await construire()
      enConstruction = false
    }
    if (vue && vue.parentElement !== conteneur) conteneur.append(vue)
    document.title = 'Tableau de bord | Rédaction'
  }

  let prevu = false
  const planifier = () => {
    if (prevu) return
    prevu = true
    requestAnimationFrame(() => {
      prevu = false
      synchroniser()
    })
  }
  new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true })
  addEventListener('hashchange', () => {
    const renvoi = /^#\/?$/.test(location.hash) || /^#\/collections\/[^/?]+$/.test(location.hash)
    if (retour && renvoi && (!interfaceVueA || Date.now() - interfaceVueA < 3000)) {
      retour = false
      location.replace(ROUTE)
      return
    }
    // Toute autre navigation : plus de retour automatique
    if (!renvoi) retour = false
    // Retour au tableau de bord : chiffres et activité relus
    if (location.hash === ROUTE) {
      vue?.remove()
      vue = null
    }
    planifier()
  })
  planifier()
}
