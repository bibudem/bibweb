/*
 * Vue de la collection « Pages » de l'interface de rédaction, à la place de
 * la liste de Decap, selon la structure du site (celle du menu de section) :
 * - « Pages » : toute l'arborescence ouverte, sections puis pages et
 *   sous-pages ;
 * - « Pages › À propos › Carrière » (dossier ouvert) : la page Carrière et
 *   ses sous-pages. Decap y listait les fichiers du dossier : la page d'un
 *   dossier (carriere/index.md) apparaissait dans sa propre liste, et les
 *   pages à sous-pages manquaient dans celle de leur parent.
 * Le menu de gauche est un arbre des mêmes pages (sections, pages, sous-pages
 * qui se déplient), à la place de celui de Decap (voir STYLE_GAUCHE).
 *
 * Les pages (et les liens de section, secondaryNav.links) se réordonnent par
 * glisser-déposer ou avec les flèches, à l'intérieur de leur parent
 * seulement : l'ordre est celui du menu de section (secondaryNav.order, voir
 * navigationDeSection dans src/lib/contenu.ts), l'adresse ne change pas.
 * « Enregistrer l'ordre » numérote 1, 2, 3… les éléments des parents
 * touchés et n'écrit que les fichiers dont l'ordre change, en un seul
 * enregistrement :
 * - en local (npm run cms:local), par decap-server, dans les fichiers ;
 * - en ligne, par l'API GitHub avec la session de Decap : un seul commit sur
 *   la branche de config.yml, refusé si elle a bougé entre-temps.
 *
 * Seule la clé order change dans les fichiers : l'en-tête est relu et réécrit
 * avec la bibliothèque yaml (commentaires, guillemets et fins de ligne
 * gardés), le corps n'est pas touché.
 *
 * Données : arborescence.json (pages, liens), générée au build. En ligne,
 * un ordre enregistré y apparaît après la reconstruction du site.
 */

const ID_VUE = 'ordre-pages'
const POSITION_FIN = Number.POSITIVE_INFINITY

// ---------------------------------------------------------------- Arbre

/** Arbre des pages : parent = page dont l'identifiant précède le dernier « / » (la plus proche qui existe) */
export function construireArbre(pages, liens) {
  const parId = new Map(pages.map((page) => [page.id, { ...page, type: 'page', cle: page.id, enfants: [] }]))
  const racine = []
  for (const noeud of parId.values()) {
    let parent = null
    let id = noeud.id
    while (!parent && id.includes('/')) {
      id = id.slice(0, id.lastIndexOf('/'))
      parent = parId.get(id) ?? null
    }
    ;(parent ? parent.enfants : racine).push(noeud)
  }
  for (const lien of liens) {
    const parent = parId.get(lien.page)
    if (!parent) continue
    parent.enfants.push({
      type: 'lien',
      cle: `${lien.page}#lien-${lien.index}`,
      page: lien.page,
      index: lien.index,
      fichier: parent.fichier,
      format: parent.format,
      titre: lien.titre,
      url: lien.url,
      ordre: lien.ordre,
      masquee: false,
      enfants: [],
    })
  }
  const trier = (liste) => {
    liste.sort(comparer)
    liste.forEach((noeud) => trier(noeud.enfants))
  }
  trier(racine)
  return racine
}

/** Ordre du menu du site : order, puis adresse ; les pages absentes du menu à la fin */
function comparer(a, b) {
  if (a.masquee !== b.masquee) return a.masquee ? 1 : -1
  const ordre = (n) => n.ordre ?? POSITION_FIN
  const adresse = (n) => (n.type === 'lien' ? n.url : `/${n.id}/`)
  return ordre(a) - ordre(b) || adresse(a).localeCompare(adresse(b), 'fr')
}

// ---------------------------------------------------------------- Fichiers

/**
 * Nouvelle version d'un fichier de page où seules les clés order changent.
 * `changements` : [{ type: 'page', ordre }] ou [{ type: 'lien', index, url, ordre }]
 */
export function appliquerOrdres(YAML, texte, format, changements) {
  const crlf = texte.includes('\r\n')
  const lf = texte.replace(/\r\n/g, '\n')
  let entete
  let avant = ''
  let apres = ''
  if (format === 'yaml') {
    entete = lf
  } else {
    const m = lf.match(/^---\n([\s\S]*?\n)?---(?=\n|$)/)
    if (!m) throw new Error('en-tête (---) introuvable')
    entete = m[1] ?? ''
    avant = '---\n'
    apres = '---' + lf.slice(m[0].length)
  }
  const doc = YAML.parseDocument(entete)
  if (doc.errors.length) throw new Error(`en-tête illisible : ${doc.errors[0].message}`)
  for (const changement of changements) {
    if (changement.type === 'lien') {
      const url = doc.getIn(['secondaryNav', 'links', changement.index, 'url'])
      if (url !== changement.url) throw new Error(`le lien « ${changement.url} » n’est plus à sa place dans le fichier`)
      doc.setIn(['secondaryNav', 'links', changement.index, 'order'], changement.ordre)
    } else {
      doc.setIn(['secondaryNav', 'order'], changement.ordre)
    }
  }
  const resultat = avant + doc.toString({ lineWidth: 0 }) + apres
  return crlf ? resultat.replace(/\n/g, '\r\n') : resultat
}

const base64EnTexte = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

/*
 * Stockage des fichiers. `appliquer(operations, message)` fait tout en un
 * seul enregistrement ; une opération est :
 * - { chemin, transformer } : modifie un fichier existant ;
 * - { chemin, source, transformer, creer: true } : crée `chemin` à partir de
 *   `source`, refusé si `chemin` existe déjà ;
 * - { chemin, supprimer: true } : supprime le fichier ;
 * - { chemin, base64, creer: true } : crée un fichier binaire (image), refusé
 *   si `chemin` existe déjà.
 * Rien n'est écrit si une lecture ou une transformation échoue.
 */

/** decap-server (npm run cms:local) : lecture et écriture directes des fichiers */
function stockageLocal(url, branche) {
  const appel = async (action, params) => {
    const reponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, params: { branch: branche, ...params } }) })
    const json = await reponse.json().catch(() => ({}))
    if (!reponse.ok) throw new Error(`serveur local : ${json.error ?? reponse.status}`)
    return json
  }
  const lire = async (chemin) => (await appel('getEntry', { path: chemin })).data
  const stockage = {
    enLigne: false,
    async appliquer(operations, message) {
      const ecrits = []
      const binaires = []
      const supprimes = []
      for (const op of operations) {
        if (op.base64) {
          if (op.creer && (await lire(op.chemin)) != null) throw new Error(`le fichier ${op.chemin} existe déjà`)
          binaires.push({ path: op.chemin, content: op.base64, encoding: 'base64' })
          continue
        }
        if (op.supprimer) {
          if ((await lire(op.chemin)) == null) throw new Error(`fichier introuvable : ${op.chemin}`)
          supprimes.push(op.chemin)
          continue
        }
        if (op.creer && (await lire(op.chemin)) != null) throw new Error(`le fichier ${op.chemin} existe déjà`)
        const texte = await lire(op.source ?? op.chemin)
        if (texte == null) throw new Error(`fichier introuvable : ${op.source ?? op.chemin}`)
        ecrits.push({ slug: op.chemin, path: op.chemin, raw: op.transformer(texte) })
      }
      if (ecrits.length || binaires.length) {
        await appel('persistEntry', {
          dataFiles: ecrits,
          assets: binaires,
          options: { commitMessage: message, useWorkflow: false, status: 'published', collectionName: 'pages' },
        })
      }
      if (supprimes.length) await appel('deleteFiles', { paths: supprimes, options: { commitMessage: message } })
    },
    modifier: (chemins, transformer, message) => stockage.appliquer(chemins.map((chemin) => ({ chemin, transformer: (texte) => transformer(chemin, texte) })), message),
  }
  return stockage
}

/** GitHub : un seul commit, à partir de l'état de la branche lu au même moment */
export function stockageGithub(backend, branche, jeton, requete = fetch) {
  const api = `${(backend.api_root || 'https://api.github.com').replace(/\/$/, '')}/repos/${backend.repo}`
  const appel = async (chemin, options = {}, absentPermis = false) => {
    const reponse = await requete(api + chemin, {
      ...options,
      headers: { Authorization: `token ${jeton}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    })
    if (absentPermis && reponse.status === 404) return null
    const json = await reponse.json().catch(() => ({}))
    if (!reponse.ok) {
      if (reponse.status === 422 && /refs/.test(chemin)) throw new Error('la branche a changé pendant l’enregistrement (autre modification en cours). Rechargez la page et recommencez.')
      throw new Error(`GitHub ${reponse.status} : ${json.message ?? ''}`)
    }
    return json
  }
  const encoder = (chemin) => chemin.split('/').map(encodeURIComponent).join('/')
  const stockage = {
    enLigne: true,
    async appliquer(operations, message) {
      const ref = await appel(`/git/ref/heads/${encoder(branche)}`)
      const tete = ref.object.sha
      const commit = await appel(`/git/commits/${tete}`)
      const lire = (chemin, absentPermis) => appel(`/contents/${encoder(chemin)}?ref=${tete}`, {}, absentPermis)
      const arbre = []
      for (const op of operations) {
        if (op.supprimer) {
          if (!(await lire(op.chemin, true))) throw new Error(`fichier introuvable : ${op.chemin}`)
          // sha nul : le fichier est retiré de l'arbre
          arbre.push({ path: op.chemin, mode: '100644', type: 'blob', sha: null })
          continue
        }
        if (op.creer && (await lire(op.chemin, true))) throw new Error(`le fichier ${op.chemin} existe déjà`)
        if (op.base64) {
          const blob = await appel('/git/blobs', { method: 'POST', body: JSON.stringify({ content: op.base64, encoding: 'base64' }) })
          arbre.push({ path: op.chemin, mode: '100644', type: 'blob', sha: blob.sha })
          continue
        }
        const fichier = await lire(op.source ?? op.chemin)
        arbre.push({ path: op.chemin, mode: '100644', type: 'blob', content: op.transformer(base64EnTexte(fichier.content)) })
      }
      const nouvelArbre = await appel('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: arbre }) })
      const nouveau = await appel('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: nouvelArbre.sha, parents: [tete] }) })
      // Sans force : refusé si la branche a avancé depuis la lecture
      await appel(`/git/refs/heads/${encoder(branche)}`, { method: 'PATCH', body: JSON.stringify({ sha: nouveau.sha, force: false }) })
    },
    modifier: (chemins, transformer, message) => stockage.appliquer(chemins.map((chemin) => ({ chemin, transformer: (texte) => transformer(chemin, texte) })), message),
  }
  return stockage
}

// ---------------------------------------------------------------- Copie d'une page

/** Chemin normalisé (« a/b/../c/ » → « a/c/ ») */
function normaliser(chemin) {
  const parties = []
  for (const partie of chemin.split('/')) {
    if (!partie || partie === '.') continue
    if (partie === '..') parties.pop()
    else parties.push(partie)
  }
  return parties.join('/')
}

/** Chemin relatif de `de` (dossier) vers `vers` (dossier), avec « ./ » ou « ../ » */
function relatif(de, vers) {
  const a = normaliser(de).split('/').filter(Boolean)
  const b = normaliser(vers).split('/').filter(Boolean)
  let commun = 0
  while (commun < a.length && commun < b.length && a[commun] === b[commun]) commun++
  const remonte = a.length - commun
  const suite = b.slice(commun).join('/')
  return (remonte ? '../'.repeat(remonte) : './') + (suite ? `${suite}/` : '')
}

/**
 * Références relatives aux dossiers images/ (« ./images/… », « ../images/… »,
 * « blrcs/images/… ») recalculées pour un fichier déplacé de `ancien` vers
 * `nouveau` (dossiers relatifs à src/content/pages). Les adresses absolues et
 * externes ne changent pas.
 */
export function deplacerReferencesImages(texte, ancien, nouveau) {
  if (normaliser(ancien) === normaliser(nouveau)) return texte
  return texte.replace(/(\]\(|:[ \t]+|=")((?:\.{1,2}\/)*(?:[\w-]+\/)*?images\/)/g, (_, avant, chemin) => avant + relatif(nouveau, `${normaliser(`${ancien}/${chemin}`)}`) )
}

/**
 * Contenu de la copie d'une page : titre (et libellé du fil d'Ariane) suivis
 * de « (copie) », masquée du menu de section, images recalculées si la copie
 * change de dossier. Le corps n'est pas touché autrement.
 */
export function copierPage(YAML, texte, ancienDossier, nouveauDossier) {
  const crlf = texte.includes('\r\n')
  const lf = deplacerReferencesImages(texte.replace(/\r\n/g, '\n'), ancienDossier, nouveauDossier)
  const m = lf.match(/^---\n([\s\S]*?\n)?---(?=\n|$)/)
  if (!m) throw new Error('en-tête (---) introuvable')
  const doc = YAML.parseDocument(m[1] ?? '')
  if (doc.errors.length) throw new Error(`en-tête illisible : ${doc.errors[0].message}`)
  const titre = doc.get('title')
  doc.set('title', `${titre ?? 'Page'} (copie)`)
  if (doc.get('crumbLabel')) doc.set('crumbLabel', `${doc.get('crumbLabel')} (copie)`)
  doc.setIn(['secondaryNav', 'hidden'], true)
  const resultat = '---\n' + doc.toString({ lineWidth: 0 }) + '---' + lf.slice(m[0].length)
  return crlf ? resultat.replace(/\n/g, '\r\n') : resultat
}

/** Même choix que Decap : le serveur local s'il répond (local_backend), sinon GitHub */
export async function choisirStockage() {
  const config = await (await fetch('./config.yml')).json()
  const branche = config.backend?.branch || 'main'
  if (config.local_backend) {
    const url = (typeof config.local_backend === 'object' && config.local_backend.url) || 'http://localhost:8081/api/v1'
    try {
      const reponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'info' }) })
      if (reponse.ok) return stockageLocal(url, branche)
    } catch {
      // Pas de serveur local : GitHub, comme Decap
    }
  }
  let jeton = null
  try {
    jeton = JSON.parse(localStorage.getItem('decap-cms-user') || 'null')?.token
  } catch {
    jeton = null
  }
  if (!jeton) throw new Error('session GitHub introuvable. Reconnectez-vous à l’interface de rédaction.')
  return stockageGithub(config.backend, branche, jeton)
}

// ---------------------------------------------------------------- Dossiers

/**
 * Dossier de src/content/pages qui porte les sous-pages d'une page, comme
 * dans les filtres de Decap (`a-propos/carriere`) : le dossier de son index,
 * ou le dossier du même nom qu'un fichier simple (politiques-reglement.md).
 */
export function dossierPorte(noeud) {
  if (noeud.type !== 'page') return null
  const relatif = noeud.fichier.replace(/^src\/content\/pages\//, '')
  if (/(^|\/)index\.(mdx?|yaml)$/i.test(relatif)) return relatif.replace(/\/?index\.(mdx?|yaml)$/i, '')
  return relatif.replace(/\.(mdx?|yaml)$/i, '')
}

/** Sections (premier niveau avec sous-pages) dans l'ordre affiché, puis les pages générales */
function sectionsEtGenerales(arbre) {
  const parTitre = (a, b) => a.titre.localeCompare(b.titre, 'fr')
  return {
    sections: arbre.filter((n) => n.enfants.length).sort(parTitre),
    generales: arbre.filter((n) => !n.enfants.length).sort(parTitre),
  }
}

/*
 * Menu de gauche : l'arbre de Decap ne montre que des dossiers (pas les pages
 * sans sous-pages ; la page d'un dossier dans sa propre liste) et se replie
 * au clic sur « Pages ». Ses liens sous « Pages » sont masqués, et un arbre
 * des pages est placé après le lien « Pages » (dans le <li> de Decap) :
 * sections, pages, sous-pages, dans l'ordre du menu du site. Les liens de
 * Decap portent data-testid : propre à cette version de Decap, à revérifier
 * si on en change.
 */
const LISTE_DECAP = 'li:has(> a[data-testid="/"])'
const STYLE_GAUCHE = `
${LISTE_DECAP} > a:not([data-testid="/"]) { display: none !important; }
${LISTE_DECAP} > a[data-testid="/"] [class*="Caret"] { display: none; }
#arbre-gauche, #arbre-gauche ul { list-style: none; margin: 0; padding: 0; }
#arbre-gauche .ag-ligne { display: flex; align-items: center; border-left: 2px solid transparent; }
#arbre-gauche .ag-lien { flex: 1; display: block; padding: 8px 8px 8px var(--retrait); font-size: 14px; font-weight: var(--graisse-moyenne, 500); line-height: 1.3; color: var(--couleur-texte, #0b113a); text-decoration: none; }
#arbre-gauche .ag-inactif { color: var(--couleur-contour, #7d8696); }
#arbre-gauche .ag-masquee { font-style: italic; }
#arbre-gauche .ag-ligne:hover, #arbre-gauche .ag-ligne:has(> [aria-current="page"]) { background: var(--couleur-teinte, #e5eef7); border-left-color: var(--couleur-accent, #0057ac); }
#arbre-gauche .ag-ligne:hover > .ag-lien, #arbre-gauche [aria-current="page"] { color: var(--couleur-lien, #0057ac); }
#arbre-gauche .ag-bascule { flex: none; width: 28px; height: 28px; margin-right: 6px; border: 0; border-radius: var(--rayon-minuscule, 4px); background: transparent; color: var(--couleur-texte-secondaire, #4a5160); cursor: pointer; font-size: 11px; }
#arbre-gauche .ag-bascule:hover { background: var(--couleur-teinte-forte, #cce2f3); color: var(--couleur-lien, #0057ac); }
#arbre-gauche .ag-bascule::before { content: ''; display: inline-block; border-left: 5px solid currentColor; border-top: 4px solid transparent; border-bottom: 4px solid transparent; transition: transform .15s var(--courbe-standard, ease); }
#arbre-gauche .ag-bascule[aria-expanded="true"]::before { transform: rotate(90deg); }
#arbre-gauche > li:not(.ag-generale) > .ag-ligne > .ag-lien { font-weight: var(--graisse-forte, 600); }
#arbre-gauche .ag-separateur { margin: 6px 12px; border-top: 1px solid var(--couleur-bordure, #c3ccd5); }
#arbre-gauche :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: -3px; }
`
const CLE_OUVERTS = 'bibweb-admin-menu-ouvert'

// ---------------------------------------------------------------- Vue

/*
 * Styles de la liste : jetons Harmonium du site (src/styles/tokens.css, servis
 * par /admin/theme.css), avec une valeur de repli si la feuille manque.
 * Boutons : plein (fond fort) et contour, en pilule ; cartes : rayon et
 * ombre Harmonium ; titres de section en Lora, comme les h4 du site.
 */
const STYLE = `
body[data-vue-ordre] main > :not(:first-child):not(#${ID_VUE}) { display: none !important; }
#${ID_VUE} { margin-top: 16px; font-size: 14px; color: var(--couleur-texte, #0b113a); }
#${ID_VUE} .op-barre { position: sticky; top: 72px; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; padding: 14px 18px; margin-bottom: 16px; background: var(--couleur-surface, #fff); border-radius: var(--rayon-carte, 12px); box-shadow: var(--ombre-1); }
#${ID_VUE} .op-aide { flex: 1 1 320px; margin: 0; color: var(--couleur-texte-secondaire, #4a5160); line-height: 1.45; }
#${ID_VUE} .op-etat { flex-basis: 100%; min-height: 1.2em; margin: 0; font-weight: var(--graisse-forte, 600); }
#${ID_VUE} .op-etat:empty { display: none; }
#${ID_VUE} .op-etat[data-type="erreur"] { color: var(--alerte-erreur-icone, #b10000); }
#${ID_VUE} .op-etat[data-type="succes"] { color: var(--vert-fonce, #024244); }
#${ID_VUE} button { font: inherit; cursor: pointer; }
#${ID_VUE} .op-bouton { min-height: 40px; padding: 0 20px; border-radius: var(--rayon-plein, 9999px); font-weight: var(--graisse-forte, 600); transition: background-color .15s, color .15s; }
#${ID_VUE} .op-enregistrer { border: 2px solid var(--couleur-fond-fort, #0b113a); background: var(--couleur-fond-fort, #0b113a); color: var(--couleur-sur-fonce, #fff); }
#${ID_VUE} .op-enregistrer:not(:disabled):hover { border-color: var(--couleur-fond-fort-survol, #0057ac); background: var(--couleur-fond-fort-survol, #0057ac); }
#${ID_VUE} .op-annuler { border: 2px solid var(--couleur-fond-fort, #0b113a); background: transparent; color: var(--couleur-fond-fort, #0b113a); }
#${ID_VUE} .op-annuler:not(:disabled):hover { background: var(--couleur-teinte, #e5eef7); }
#${ID_VUE} .op-bouton:disabled { border-color: var(--couleur-bordure, #c3ccd5); background: var(--couleur-fond, #f8fafb); color: var(--couleur-texte-secondaire, #4a5160); cursor: default; }
#${ID_VUE} ul { list-style: none; margin: 0; padding: 0; }
#${ID_VUE} .op-section { margin-bottom: 16px; background: var(--couleur-surface, #fff); border-radius: var(--rayon-carte, 12px); box-shadow: var(--ombre-1); padding: 10px 10px 14px; }
#${ID_VUE} .op-section > .op-ligne { padding: 8px; }
#${ID_VUE} .op-section > .op-ligne .op-titre { font-family: var(--police-serif, Georgia, serif); font-size: 1.25rem; font-weight: var(--graisse-normale, 400); line-height: 1.2; }
#${ID_VUE} .op-vide { margin: 4px 8px; color: var(--couleur-texte-secondaire, #4a5160); }
#${ID_VUE} .op-liste .op-liste { margin-left: 28px; border-left: 2px solid var(--couleur-teinte, #e5eef7); }
#${ID_VUE} .op-ligne { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--rayon-tres-petit, 8px); border-top: 2px solid transparent; border-bottom: 2px solid transparent; }
#${ID_VUE} li.op-item > .op-ligne:hover { background: var(--couleur-fond, #f8fafb); }
#${ID_VUE} .op-poignee { cursor: grab; color: var(--couleur-contour, #7d8696); font-size: 16px; line-height: 1; user-select: none; border-radius: var(--rayon-minuscule, 4px); padding: 2px; }
#${ID_VUE} .op-poignee:hover { color: var(--couleur-texte, #0b113a); }
#${ID_VUE} li[data-fixe] > .op-ligne .op-poignee, #${ID_VUE} li[data-seul] > .op-ligne .op-poignee { visibility: hidden; }
#${ID_VUE} .op-numero { flex: none; box-sizing: border-box; min-width: 3.4em; padding: 2px 8px; border-radius: var(--rayon-plein, 9999px); font-size: var(--texte-minuscule, .75rem); font-weight: var(--graisse-grasse, 700); line-height: 1.4; font-variant-numeric: tabular-nums; text-align: center; }
#${ID_VUE} li[data-niveau="2"] > .op-ligne .op-numero { background: var(--bleu-fonce, #0b113a); color: var(--couleur-sur-fonce, #fff); }
#${ID_VUE} li[data-niveau="3"] > .op-ligne .op-numero { background: var(--couleur-teinte-forte, #cce2f3); color: var(--bleu-fonce, #0b113a); }
#${ID_VUE} li[data-niveau="4"] > .op-ligne .op-numero, #${ID_VUE} li[data-niveau="5"] > .op-ligne .op-numero { background: var(--couleur-surface, #fff); color: var(--couleur-texte-secondaire, #4a5160); box-shadow: inset 0 0 0 1px var(--couleur-bordure, #c3ccd5); }
#${ID_VUE} li[data-niveau="2"] > .op-ligne .op-titre { font-weight: var(--graisse-forte, 600); }
#${ID_VUE} li[data-fixe] > .op-ligne .op-numero { background: none; box-shadow: none; color: var(--couleur-contour, #7d8696); }
#${ID_VUE} .op-titre { flex: 1; color: inherit; font-weight: var(--graisse-moyenne, 500); text-decoration: none; }
#${ID_VUE} a.op-titre:hover { color: var(--couleur-lien-survol, #003c78); text-decoration: underline; }
#${ID_VUE} .op-badge { padding: 1px 8px; border-radius: var(--rayon-plein, 9999px); background: var(--couleur-teinte, #e5eef7); color: var(--couleur-texte-secondaire, #4a5160); font-size: var(--texte-minuscule, .75rem); font-weight: var(--graisse-forte, 600); white-space: nowrap; }
#${ID_VUE} li.op-modifie > .op-ligne .op-numero { background: var(--couleur-accent, #0057ac); color: var(--couleur-sur-fonce, #fff); box-shadow: none; }
#${ID_VUE} .op-actions-conteneur { position: relative; flex: none; }
#${ID_VUE} .op-actions { width: 30px; height: 30px; padding: 0; border: 0; border-radius: var(--rayon-plein, 9999px); background: transparent; color: var(--couleur-texte-secondaire, #4a5160); font-size: 18px; line-height: 1; opacity: .45; }
#${ID_VUE} .op-ligne:hover .op-actions, #${ID_VUE} .op-ligne:focus-within .op-actions, #${ID_VUE} .op-actions[aria-expanded="true"] { opacity: 1; }
#${ID_VUE} .op-actions:hover, #${ID_VUE} .op-actions[aria-expanded="true"] { background: var(--couleur-teinte, #e5eef7); color: var(--couleur-lien, #0057ac); }
#${ID_VUE} .op-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 10; display: flex; flex-direction: column; min-width: 210px; padding: 6px; background: var(--couleur-surface, #fff); border-radius: var(--rayon-tres-petit, 8px); box-shadow: var(--ombre-2); }
#${ID_VUE} .op-menu[hidden] { display: none; }
#${ID_VUE} .op-action { display: block; padding: 8px 12px; border: 0; border-radius: var(--rayon-minuscule, 4px); background: none; color: var(--couleur-texte, #0b113a); font-size: 14px; font-weight: var(--graisse-moyenne, 500); text-align: left; text-decoration: none; white-space: nowrap; }
#${ID_VUE} .op-action:hover, #${ID_VUE} .op-action:focus-visible { background: var(--couleur-teinte, #e5eef7); color: var(--couleur-lien, #0057ac); }
#${ID_VUE} .op-action.op-danger { color: var(--alerte-erreur-icone, #b10000); }
#${ID_VUE} .op-action.op-danger:hover { background: var(--alerte-erreur-fond, #fee1de); color: var(--alerte-erreur-icone, #b10000); }
#${ID_VUE} .op-action[aria-disabled="true"], #${ID_VUE} .op-action[aria-disabled="true"]:hover { background: none; color: var(--couleur-contour, #7d8696); cursor: not-allowed; }
.op-dialogue { max-width: min(560px, calc(100vw - 32px)); padding: 28px; border: 0; border-radius: var(--rayon-carte, 12px); color: var(--couleur-texte, #0b113a); font-family: var(--police-sans, sans-serif); font-size: 14px; line-height: 1.5; box-shadow: var(--ombre-2); }
.op-dialogue::backdrop { background: rgb(11 17 58 / 45%); }
.op-dialogue h2 { margin: 0 0 12px; font-size: var(--texte-grand, 1.25rem); font-weight: var(--graisse-forte, 600); line-height: 1.2; }
.op-dialogue p { margin: 0 0 8px; }
.op-dialogue ul { max-height: 240px; overflow: auto; margin: 4px 0 12px; padding-left: 20px; }
.op-dialogue .op-note { color: var(--couleur-texte-secondaire, #4a5160); }
.op-dialogue-boutons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.op-dialogue button { min-height: 40px; padding: 0 20px; border: 2px solid var(--couleur-fond-fort, #0b113a); border-radius: var(--rayon-plein, 9999px); font: inherit; font-weight: var(--graisse-forte, 600); cursor: pointer; transition: background-color .15s; }
.op-dialogue .op-fermer { background: transparent; color: var(--couleur-fond-fort, #0b113a); }
.op-dialogue .op-fermer:hover { background: var(--couleur-teinte, #e5eef7); }
.op-dialogue .op-confirmer { background: var(--couleur-fond-fort, #0b113a); color: var(--couleur-sur-fonce, #fff); }
.op-dialogue .op-confirmer:hover { border-color: var(--couleur-fond-fort-survol, #0057ac); background: var(--couleur-fond-fort-survol, #0057ac); }
.op-dialogue .op-confirmer.op-danger { border-color: var(--alerte-erreur-icone, #b10000); background: var(--alerte-erreur-icone, #b10000); }
.op-dialogue .op-confirmer.op-danger:hover { border-color: #8a0000; background: #8a0000; }
.op-dialogue :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 2px; }
#${ID_VUE} li[data-fixe] > .op-ligne { color: var(--couleur-texte-secondaire, #4a5160); }
#${ID_VUE} .op-glisse { opacity: .4; }
#${ID_VUE} .op-avant > .op-ligne { border-top-color: var(--couleur-accent, #0057ac); }
#${ID_VUE} .op-apres > .op-ligne { border-bottom-color: var(--couleur-accent, #0057ac); }
#${ID_VUE} :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 2px; }
`

/**
 * Vue de la collection « Pages » : toute l'arborescence sur « Pages », et
 * la page du dossier ouvert avec ses sous-pages sur « Pages › À propos ».
 * Un seul modèle en mémoire (l'ordre des enfants de chaque nœud) : chaque
 * vue en est un rendu, les changements non enregistrés suivent d'une vue à
 * l'autre.
 */
export function installerVueOrdre(donnees, YAML, pris = new Set(donnees.ids ?? [])) {
  const arbre = construireArbre(donnees.pages ?? [], donnees.liens ?? [])
  const noeuds = new Map()
  const parents = new Map()
  const parDossier = new Map()
  const indexer = (liste, parent) =>
    liste.forEach((n) => {
      noeuds.set(n.cle, n)
      parents.set(n.cle, parent)
      const dossier = dossierPorte(n)
      if (dossier != null && !parDossier.has(dossier)) parDossier.set(dossier, n)
      indexer(n.enfants, n)
    })
  indexer(arbre, null)

  /** Suite enregistrée des enfants de chaque nœud (cle → [cles]) */
  const origine = new Map()
  const memoriserOrigine = () => {
    origine.clear()
    for (const n of noeuds.values()) if (n.enfants.length) origine.set(n.cle, n.enfants.map((e) => e.cle))
  }
  memoriserOrigine()
  /** cle → nouvel ordre, seulement s'il diffère de l'ordre enregistré */
  const changements = new Map()

  let vue = null
  let portee = undefined
  let etat = null
  let enCours = false
  let majAuPlacement = false

  const style = document.createElement('style')
  style.textContent = STYLE + '\n' + STYLE_GAUCHE
  document.head.append(style)

  // ------------------------------------------------ Modèle

  const mobilesDe = (parent) => parent.enfants.filter((n) => !n.masquee)

  /**
   * Numéro hiérarchique dans le menu de sa section, d'après l'ordre courant :
   * « 2 » au niveau 2, « 2.1 » au niveau 3, « 2.1.3 » au niveau 4. Les
   * sections (niveau 1) n'en ont pas ; une page hors du menu, « – ».
   */
  function numeroDe(noeud) {
    const parent = parents.get(noeud.cle)
    if (!parent || noeud.masquee) return '–'
    const rang = String(mobilesDe(parent).indexOf(noeud) + 1)
    if (!parents.get(parent.cle)) return rang
    const avant = numeroDe(parent)
    return avant === '–' ? rang : `${avant}.${rang}`
  }
  const resumeChangements = () => (changements.size ? `${changements.size} élément(s) à enregistrer.` : 'Aucun changement à enregistrer.')

  /** Nouvel ordre 1, 2, 3… des enfants de `parent` si leur suite diffère de celle enregistrée */
  function recalculer(parent) {
    parent.enfants.sort((a, b) => Number(a.masquee) - Number(b.masquee))
    const actuels = mobilesDe(parent).map((n) => n.cle)
    const enregistres = (origine.get(parent.cle) ?? []).filter((cle) => !noeuds.get(cle).masquee)
    const inchange = actuels.length === enregistres.length && actuels.every((cle, i) => cle === enregistres[i])
    actuels.forEach((cle, i) => {
      if (inchange || noeuds.get(cle).ordre === i + 1) changements.delete(cle)
      else changements.set(cle, i + 1)
    })
  }

  /** Déplace `cle` avant ou après `cible` (même parent), dans le modèle puis à l'écran */
  function deplacer(cle, cible, avant) {
    const parent = parents.get(cle)
    if (!parent || parents.get(cible) !== parent || cle === cible) return
    const liste = parent.enfants
    const noeud = liste.splice(liste.findIndex((n) => n.cle === cle), 1)[0]
    liste.splice(liste.findIndex((n) => n.cle === cible) + (avant ? 0 : 1), 0, noeud)
    recalculer(parent)
    const li = vue?.querySelector(`li.op-item[data-cle="${CSS.escape(cle)}"]`)
    const liCible = vue?.querySelector(`li.op-item[data-cle="${CSS.escape(cible)}"]`)
    if (li && liCible) {
      if (avant) liCible.before(li)
      else liCible.after(li)
    }
    majNumeros()
    rendreGauche()
    annoncer(`« ${noeud.titre} » en position ${numeroDe(noeud)}. ${resumeChangements()}`)
  }

  function annuler() {
    for (const [cle, suite] of origine) {
      const rang = new Map(suite.map((c, i) => [c, i]))
      noeuds.get(cle).enfants.sort((a, b) => rang.get(a.cle) - rang.get(b.cle))
    }
    changements.clear()
    rendre()
    rendreGauche()
    annoncer('Modifications annulées.')
  }

  // ------------------------------------------------ Rendu

  function element(balise, attributs = {}, ...enfants) {
    const el = document.createElement(balise)
    for (const [cle, valeur] of Object.entries(attributs)) {
      if (valeur === false || valeur == null) continue
      if (cle === 'class') el.className = valeur
      else if (cle === 'texte') el.textContent = valeur
      else el.setAttribute(cle, valeur === true ? '' : valeur)
    }
    el.append(...enfants.filter(Boolean))
    return el
  }

  const titreDe = (noeud) => (noeud.type === 'page' && noeud.entree ? element('a', { class: 'op-titre', href: noeud.entree, texte: noeud.titre }) : element('span', { class: 'op-titre', texte: noeud.titre }))

  function badgesDe(noeud) {
    const badges = []
    if (noeud.type === 'lien') badges.push(element('span', { class: 'op-badge', title: noeud.url, texte: `Lien → ${noeud.url}` }))
    if (noeud.type === 'page' && noeud.format === 'mdx') badges.push(element('span', { class: 'op-badge', title: 'Page .mdx : son contenu ne se modifie pas dans l’interface ; son ordre, oui.', texte: '.mdx' }))
    if (noeud.type === 'page' && noeud.format === 'yaml') badges.push(element('span', { class: 'op-badge', texte: 'Vitrine' }))
    if (noeud.masquee) badges.push(element('span', { class: 'op-badge', texte: 'Hors du menu' }))
    return badges
  }

  function rendreItem(noeud, deplacable = true) {
    const fixe = !deplacable || noeud.masquee
    const li = element(
      'li',
      { class: 'op-item', 'data-cle': noeud.cle, draggable: fixe ? false : 'true', 'data-fixe': fixe },
      element(
        'div',
        { class: 'op-ligne' },
        fixe
          ? element('span', { class: 'op-poignee', 'aria-hidden': 'true', texte: '⠿' })
          : element('span', { class: 'op-poignee', role: 'button', tabindex: '0', title: 'Glisser pour déplacer (au clavier : flèches haut et bas)', 'aria-label': `Déplacer « ${noeud.titre} » : flèches haut et bas`, texte: '⠿' }),
        deplacable ? element('span', { class: 'op-numero', title: 'Position dans le menu de la section' }) : null,
        titreDe(noeud),
        ...badgesDe(noeud),
        menuActions(noeud),
      ),
    )
    if (deplacable && noeud.enfants.length) li.append(rendreListe(noeud))
    return li
  }

  function rendreListe(parent) {
    const ul = element('ul', { class: 'op-liste', 'data-parent': parent.cle, 'aria-label': `Sous-pages de « ${parent.titre} »` })
    ul.append(...parent.enfants.map((n) => rendreItem(n)))
    return ul
  }

  /** Carte d'un nœud : son titre (lien vers l'éditeur), puis ses sous-pages */
  function rendreCarte(noeud) {
    const entete = element('div', { class: 'op-ligne' }, titreDe(noeud), ...badgesDe(noeud), menuActions(noeud))
    const contenu = noeud.enfants.length ? rendreListe(noeud) : element('p', { class: 'op-vide', texte: 'Aucune sous-page. « + Page » en crée une ici.' })
    return element('li', { class: 'op-section', 'data-cle': noeud.cle }, entete, contenu)
  }

  function rendreArbre() {
    const racine = element('ul', { class: 'op-arbre' })
    if (portee) {
      racine.append(rendreCarte(portee))
      return racine
    }
    const { sections, generales } = sectionsEtGenerales(arbre)
    racine.append(...sections.map(rendreCarte))
    if (generales.length) {
      const ul = element('ul', { class: 'op-liste', 'aria-label': 'Pages générales' })
      ul.append(...generales.map((page) => rendreItem({ ...page, enfants: [] }, false)))
      racine.append(element('li', { class: 'op-section' }, element('div', { class: 'op-ligne' }, element('span', { class: 'op-titre', texte: 'Pages générales (hors des sections, sans ordre de menu)' })), ul))
    }
    return racine
  }

  function construireVue() {
    const enregistrer = element('button', { type: 'button', class: 'op-bouton op-enregistrer', disabled: true, texte: 'Enregistrer l’ordre' })
    const boutonAnnuler = element('button', { type: 'button', class: 'op-bouton op-annuler', disabled: true, texte: 'Annuler' })
    etat = element('p', { class: 'op-etat', role: 'status', 'aria-live': 'polite' })
    const section = element(
      'section',
      { id: ID_VUE, 'aria-label': 'Pages et ordre du menu' },
      element(
        'div',
        { class: 'op-barre' },
        element('p', { class: 'op-aide', texte: 'Structure du menu du site. Glissez une page par sa poignée ⠿ (au clavier : la poignée, puis les flèches haut et bas) pour changer son ordre sous son parent ; son adresse ne change pas. Le bouton ⋯ d’une page : modifier, dupliquer, supprimer.' }),
        boutonAnnuler,
        enregistrer,
        etat,
      ),
      rendreArbre(),
    )
    enregistrer.addEventListener('click', sauvegarder)
    boutonAnnuler.addEventListener('click', annuler)
    brancherInteractions(section)
    return section
  }

  /** Nouveau rendu de l'arbre dans la vue existante (annulation, changement de dossier) */
  function rendre() {
    if (!vue) return
    vue.querySelector('.op-arbre').replaceWith(rendreArbre())
    majNumeros()
  }

  function majNumeros() {
    if (!vue) return
    for (const ul of vue.querySelectorAll('ul.op-liste[data-parent]')) {
      const freres = [...ul.children].filter((li) => li.matches('li.op-item:not([data-fixe])'))
      freres.forEach((li, i) => {
        li.toggleAttribute('data-seul', freres.length === 1)
        li.draggable = freres.length > 1
        const poignee = li.querySelector(':scope > .op-ligne .op-poignee')
        poignee.tabIndex = freres.length > 1 ? 0 : -1
        poignee.toggleAttribute('aria-hidden', freres.length === 1)
        const numero = numeroDe(noeuds.get(li.dataset.cle))
        li.dataset.niveau = String(numero.split('.').length + 1)
        li.querySelector(':scope > .op-ligne .op-numero').textContent = numero
        li.classList.toggle('op-modifie', changements.has(li.dataset.cle))
      })
    }
    vue.querySelector('.op-enregistrer').disabled = !changements.size || enCours
    vue.querySelector('.op-annuler').disabled = !changements.size || enCours
  }

  function annoncer(texte, type = '') {
    if (!etat) return
    etat.textContent = texte
    etat.dataset.type = type
  }

  // ------------------------------------------------ Glisser-déposer et flèches

  function brancherInteractions(racine) {
    let glisse = null
    let indicateur = null
    const nettoyer = () => {
      indicateur?.classList.remove('op-avant', 'op-apres')
      indicateur = null
    }
    /** Élément frère de celui qu'on glisse, sous le pointeur */
    const frereSous = (cible) => {
      let li = cible.closest?.('li.op-item')
      while (li && li.parentElement !== glisse.parentElement) li = li.parentElement.closest('li.op-item')
      return li && li !== glisse && !li.hasAttribute('data-fixe') ? li : null
    }
    const avantDe = (li, y) => {
      const ligne = li.querySelector(':scope > .op-ligne').getBoundingClientRect()
      return y < ligne.top + ligne.height / 2
    }

    racine.addEventListener('dragstart', (e) => {
      const li = e.target
      if (enCours || !(li instanceof HTMLElement) || !li.matches('li.op-item[draggable="true"]')) return
      glisse = li
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', li.dataset.cle)
      requestAnimationFrame(() => li.classList.add('op-glisse'))
    })
    racine.addEventListener('dragover', (e) => {
      if (!glisse) return
      const li = frereSous(e.target)
      nettoyer()
      if (!li) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      indicateur = li
      li.classList.add(avantDe(li, e.clientY) ? 'op-avant' : 'op-apres')
    })
    racine.addEventListener('drop', (e) => {
      if (!glisse) return
      const li = frereSous(e.target)
      nettoyer()
      if (!li) return
      e.preventDefault()
      deplacer(glisse.dataset.cle, li.dataset.cle, avantDe(li, e.clientY))
    })
    racine.addEventListener('dragend', () => {
      glisse?.classList.remove('op-glisse')
      glisse = null
      nettoyer()
    })
    // Clavier : poignée, puis flèches haut et bas ; Échap ferme le menu d'actions
    racine.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOuvert) {
        e.preventDefault()
        fermerMenu(true)
        return
      }
      const poignee = e.target.closest?.('.op-poignee[role="button"]')
      if (!poignee || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      e.preventDefault()
      if (enCours) return
      const li = poignee.closest('li.op-item')
      const freres = [...li.parentElement.children].filter((x) => x.matches('li.op-item:not([data-fixe])'))
      const i = freres.indexOf(li)
      const haut = e.key === 'ArrowUp'
      const voisin = haut ? freres[i - 1] : freres[i + 1]
      if (!voisin) return
      deplacer(li.dataset.cle, voisin.dataset.cle, haut)
      li.querySelector(':scope > .op-ligne .op-poignee').focus()
    })
    racine.addEventListener('click', (e) => {
      const declencheur = e.target.closest?.('.op-actions')
      if (declencheur) {
        const menu = declencheur.nextElementSibling
        if (menuOuvert === menu) fermerMenu(true)
        else ouvrirMenu(declencheur, menu)
        return
      }
      const action = e.target.closest?.('.op-action')
      if (!action) return
      const raison = action.getAttribute('data-raison')
      const noeud = noeuds.get(action.dataset.cle)
      if (action.getAttribute('aria-disabled') === 'true') {
        e.preventDefault()
        fermerMenu(true)
        annoncer(raison, 'erreur')
        return
      }
      fermerMenu(false)
      if (action.dataset.action === 'dupliquer') dupliquer(noeud)
      else if (action.dataset.action === 'supprimer') supprimer(noeud)
    })
  }

  // ------------------------------------------------ Menu d'actions (⋯)

  let menuOuvert = null
  function ouvrirMenu(declencheur, menu) {
    fermerMenu(false)
    menu.hidden = false
    declencheur.setAttribute('aria-expanded', 'true')
    menuOuvert = menu
    menu.querySelector('.op-action:not([aria-disabled="true"])')?.focus()
  }
  function fermerMenu(rendreFocus) {
    if (!menuOuvert) return
    const declencheur = menuOuvert.previousElementSibling
    menuOuvert.hidden = true
    declencheur?.setAttribute('aria-expanded', 'false')
    menuOuvert = null
    if (rendreFocus) declencheur?.focus()
  }
  document.addEventListener('click', (e) => {
    if (menuOuvert && !menuOuvert.parentElement.contains(e.target)) fermerMenu(false)
  })

  /** Pourquoi une page ne se duplique pas depuis l'interface (null : elle se duplique) */
  function raisonPasDeCopie(noeud) {
    if (noeud.type === 'lien') return 'Lien du menu : il se modifie dans la vitrine de la section.'
    if (noeud.format === 'yaml') return 'Vitrine : elle se duplique dans le dépôt.'
    if (noeud.format === 'mdx') return 'Page .mdx (formulaire ou page spéciale) : elle se duplique dans le dépôt.'
    return null
  }

  /** Pourquoi une page ne se supprime pas depuis l'interface (null : elle se supprime, après confirmation) */
  function raisonPasDeSuppression(noeud) {
    if (noeud.type === 'lien') return 'Lien du menu : il se retire dans la vitrine de la section.'
    if (noeud.format === 'yaml') return 'Vitrine (page de section) : elle se supprime dans le dépôt.'
    if (noeud.format === 'mdx') return 'Page .mdx (formulaire ou page spéciale) : elle se supprime dans le dépôt.'
    if (noeud.enfants.some((e) => e.type === 'page')) return `« ${noeud.titre} » a des sous-pages : supprimez-les ou déplacez-les d’abord (dans le dépôt).`
    return null
  }

  function menuActions(noeud) {
    const id = `op-menu-${noeud.cle.replace(/[^\w-]/g, '-')}`
    const modifier = noeud.type === 'lien' ? parents.get(noeud.cle)?.entree : noeud.entree
    const raisonCopie = raisonPasDeCopie(noeud)
    const raisonSuppression = raisonPasDeSuppression(noeud)
    const desactive = (raison) => (raison ? { 'aria-disabled': 'true', 'data-raison': raison, title: raison } : {})
    // Vitrine (page de section) : modifier seulement ; elle ne se duplique ni ne
    // se supprime depuis l'interface, les deux actions n'apparaissent pas
    const vitrine = noeud.type === 'page' && noeud.format === 'yaml'
    return element(
      'div',
      { class: 'op-actions-conteneur' },
      element('button', { type: 'button', class: 'op-actions', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': `Actions pour « ${noeud.titre} »`, title: vitrine ? 'Modifier la vitrine' : 'Modifier, dupliquer, supprimer', texte: '⋯' }),
      element(
        'div',
        { class: 'op-menu', id, hidden: true },
        modifier
          ? element('a', { class: 'op-action', href: modifier, 'data-cle': noeud.cle, texte: noeud.type === 'lien' ? 'Modifier dans la vitrine' : 'Modifier' })
          : element('button', { type: 'button', class: 'op-action', 'data-cle': noeud.cle, ...desactive('Page .mdx : son contenu ne se modifie pas dans l’interface.'), texte: 'Modifier' }),
        vitrine ? null : element('button', { type: 'button', class: 'op-action', 'data-action': 'dupliquer', 'data-cle': noeud.cle, ...desactive(raisonCopie), texte: 'Dupliquer' }),
        vitrine ? null : element('button', { type: 'button', class: 'op-action op-danger', 'data-action': 'supprimer', 'data-cle': noeud.cle, ...desactive(raisonSuppression), texte: 'Supprimer…' }),
      ),
    )
  }

  /** Boîte de dialogue : résout true si l'action est confirmée */
  function dialogue({ titre, texte, liste = [], note = null, confirmer = null, danger = false }) {
    return new Promise((resoudre) => {
      const fermer = element('button', { type: 'button', class: 'op-fermer', texte: confirmer ? 'Annuler' : 'Fermer' })
      const valider = confirmer ? element('button', { type: 'button', class: `op-confirmer${danger ? ' op-danger' : ''}`, texte: confirmer }) : null
      const boite = element(
        'dialog',
        { class: 'op-dialogue', 'aria-labelledby': 'op-dialogue-titre' },
        element('h2', { id: 'op-dialogue-titre', texte: titre }),
        element('p', { texte }),
        liste.length ? element('ul', {}, ...liste.map((t) => element('li', { texte: t }))) : null,
        note ? element('p', { class: 'op-note', texte: note }) : null,
        element('div', { class: 'op-dialogue-boutons' }, fermer, valider),
      )
      const finir = (reponse) => {
        boite.close()
        boite.remove()
        resoudre(reponse)
      }
      fermer.addEventListener('click', () => finir(false))
      valider?.addEventListener('click', () => finir(true))
      boite.addEventListener('cancel', (e) => {
        e.preventDefault()
        finir(false)
      })
      document.body.append(boite)
      boite.showModal()
      // Action destructive : le focus part sur « Annuler »
      fermer.focus()
    })
  }

  const nomReference = (r) => (r.titre ? `${r.titre} — ${r.fichier.replace(/^src\/content\/pages\//, '')}` : r.fichier)
  const versId = (nom) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // ------------------------------------------------ Dupliquer et supprimer

  async function dupliquer(noeud) {
    const raison = raisonPasDeCopie(noeud)
    if (raison) return annoncer(raison, 'erreur')
    if (enCours) return
    if (changements.size) return annoncer('Enregistrez ou annulez d’abord le nouvel ordre.', 'erreur')
    const parent = parents.get(noeud.cle)
    // La copie est une sœur de la page : dans le dossier des sous-pages du parent
    const dossier = parent ? (dossierPorte(parent) ?? '') : ''
    const source = noeud.fichier.replace(/^src\/content\/pages\//, '')
    const dossierSource = source.split('/').slice(0, -1).join('/')
    const base = /(^|\/)index\.md$/i.test(source) ? dossierSource.split('/').pop() : source.split('/').pop().replace(/\.md$/i, '')
    const idDe = (nom) => versId(dossier ? `${dossier}/${nom}` : nom)
    let nom = `${base}-copie`
    for (let n = 2; pris.has(idDe(nom)); n++) nom = `${base}-copie-${n}`
    const relatifCopie = dossier ? `${dossier}/${nom}` : nom
    const chemin = `src/content/pages/${relatifCopie}.md`
    enCours = true
    majNumeros()
    annoncer(`Copie de « ${noeud.titre} »…`)
    try {
      const stockage = await choisirStockage()
      await stockage.appliquer([{ chemin, source: noeud.fichier, creer: true, transformer: (texte) => copierPage(YAML, texte, dossierSource, dossier) }], `Pages : copie de « ${noeud.titre} »`)
    } catch (erreur) {
      console.error('Copie de page', erreur)
      annoncer(`Échec de la copie : ${erreur.message} Rien n’a été créé.`, 'erreur')
      return
    } finally {
      enCours = false
      majNumeros()
    }
    const copie = {
      type: 'page',
      cle: idDe(nom),
      id: idDe(nom),
      fichier: chemin,
      format: 'md',
      titre: `${noeud.titre} (copie)`,
      ordre: noeud.ordre,
      masquee: true,
      entree: `#/collections/pages/entries/${relatifCopie.split('/').map(encodeURIComponent).join('/')}`,
      enfants: [],
      references: [],
    }
    ;(parent ? parent.enfants : arbre).push(copie)
    noeuds.set(copie.cle, copie)
    parents.set(copie.cle, parent)
    pris.add(copie.id)
    memoriserOrigine()
    rendre()
    rendreGauche()
    annoncer(`Copie créée : « ${copie.titre} », hors du menu du site. Elle s’ouvre dans l’éditeur : changez son titre, puis décochez « Masquer du menu » quand elle est prête.`, 'succes')
    location.hash = copie.entree
  }

  async function supprimer(noeud) {
    const raison = raisonPasDeSuppression(noeud)
    if (raison) return annoncer(raison, 'erreur')
    if (enCours) return
    if (changements.size) return annoncer('Enregistrez ou annulez d’abord le nouvel ordre.', 'erreur')
    const references = noeud.references ?? []
    const bloquants = references.filter((r) => r.bloquant)
    const declencheur = vue?.querySelector(`li[data-cle="${CSS.escape(noeud.cle)}"] .op-actions`)
    if (bloquants.length) {
      await dialogue({
        titre: 'Suppression impossible ici',
        texte: `« ${noeud.titre} » est utilisée par le code du site (menus, gabarits). La supprimer laisserait un lien mort dans un menu, ou ferait échouer la mise en ligne. Elle se supprime dans le dépôt, en corrigeant ces fichiers :`,
        liste: bloquants.map(nomReference),
      })
      declencheur?.focus()
      return
    }
    const confirme = await dialogue({
      titre: `Supprimer « ${noeud.titre} » ?`,
      texte: references.length ? `${references.length} page${references.length > 1 ? 's ont' : ' a'} un lien vers elle. Ce lien deviendra un lien mort, à corriger ensuite :` : 'Aucune autre page n’a de lien vers elle.',
      liste: references.map(nomReference),
      note: `Le fichier ${noeud.fichier} sera supprimé ; ses images restent dans le dossier images/. L’adresse /${noeud.id}/ ne répondra plus.`,
      confirmer: 'Supprimer la page',
      danger: true,
    })
    if (!confirme) {
      declencheur?.focus()
      return
    }
    enCours = true
    majNumeros()
    annoncer(`Suppression de « ${noeud.titre} »…`)
    let stockage
    try {
      stockage = await choisirStockage()
      await stockage.appliquer([{ chemin: noeud.fichier, supprimer: true }], `Pages : suppression de « ${noeud.titre} »`)
    } catch (erreur) {
      console.error('Suppression de page', erreur)
      annoncer(`Échec de la suppression : ${erreur.message} Rien n’a été supprimé.`, 'erreur')
      return
    } finally {
      enCours = false
      majNumeros()
    }
    const parent = parents.get(noeud.cle)
    const liste = parent ? parent.enfants : arbre
    liste.splice(liste.indexOf(noeud), 1)
    noeuds.delete(noeud.cle)
    parents.delete(noeud.cle)
    pris.delete(noeud.id)
    memoriserOrigine()
    rendre()
    rendreGauche()
    annoncer(`« ${noeud.titre} » supprimée${stockage.enLigne ? ' (un commit ; le site sera à jour après sa reconstruction)' : ''}.`, 'succes')
  }

  // ------------------------------------------------ Enregistrement

  async function sauvegarder() {
    if (!changements.size || enCours) return
    enCours = true
    majNumeros()
    annoncer('Enregistrement…')
    try {
      const parFichier = new Map()
      for (const [cle, ordre] of changements) {
        const noeud = noeuds.get(cle)
        const entree = parFichier.get(noeud.fichier) ?? { format: noeud.format, changements: [] }
        entree.changements.push(noeud.type === 'lien' ? { type: 'lien', index: noeud.index, url: noeud.url, ordre } : { type: 'page', ordre })
        parFichier.set(noeud.fichier, entree)
      }
      const stockage = await choisirStockage()
      const n = parFichier.size
      await stockage.modifier(
        [...parFichier.keys()],
        (chemin, texte) => {
          const { format, changements: liste } = parFichier.get(chemin)
          try {
            return appliquerOrdres(YAML, texte, format, liste)
          } catch (erreur) {
            throw new Error(`${chemin} : ${erreur.message}`)
          }
        },
        `Pages : ordre du menu (${n} fichier${n > 1 ? 's' : ''})`,
      )
      for (const [cle, ordre] of changements) noeuds.get(cle).ordre = ordre
      memoriserOrigine()
      changements.clear()
      rendreGauche()
      annoncer(stockage.enLigne ? `Ordre enregistré (${n} fichier${n > 1 ? 's' : ''}, un commit). Le site sera à jour après sa reconstruction, dans quelques minutes.` : `Ordre enregistré dans ${n} fichier${n > 1 ? 's' : ''}.`, 'succes')
    } catch (erreur) {
      console.error('Ordre des pages', erreur)
      annoncer(`Échec de l’enregistrement : ${erreur.message} Rien n’a été modifié.`, 'erreur')
    } finally {
      enCours = false
      majNumeros()
    }
  }

  // ------------------------------------------------ Menu de gauche

  const hrefDossier = (dossier) => `#/collections/pages/filter/${dossier.split('/').map(encodeURIComponent).join('/')}`
  const pagesEnfants = (noeud) => noeud.enfants.filter((e) => e.type === 'page')
  const adresseCourante = () => location.hash.replace(/\?.*$/, '')

  /** Adresse d'un élément du menu : sa liste s'il a des sous-pages, sinon l'éditeur */
  function cibleGauche(noeud) {
    const dossier = dossierPorte(noeud)
    if (pagesEnfants(noeud).length && dossier && parDossier.get(dossier) === noeud) return hrefDossier(dossier)
    return noeud.entree
  }

  // Éléments dépliés : mémorisés dans ce navigateur ; par défaut, les sections
  const sectionsParDefaut = () => sectionsEtGenerales(arbre).sections.map((n) => n.cle)
  let ouverts
  try {
    const memoire = JSON.parse(localStorage.getItem(CLE_OUVERTS) || 'null')
    ouverts = new Set(Array.isArray(memoire) ? memoire : sectionsParDefaut())
  } catch {
    ouverts = new Set(sectionsParDefaut())
  }
  const memoriserOuverts = () => {
    try {
      localStorage.setItem(CLE_OUVERTS, JSON.stringify([...ouverts]))
    } catch {
      // Sans stockage : l'état dure le temps de la page
    }
  }

  /** Nœud de l'adresse courante : liste d'un dossier, ou page ouverte dans l'éditeur */
  function noeudCourant() {
    const adresse = adresseCourante()
    for (const n of noeuds.values()) if (n.type === 'page' && (cibleGauche(n) === adresse || n.entree === adresse)) return n
    return null
  }

  /** Déplie le chemin jusqu'à la page ouverte (sans rien replier) */
  function deplierChemin() {
    let n = noeudCourant()
    let change = false
    while ((n = parents.get(n?.cle))) {
      if (!ouverts.has(n.cle)) {
        ouverts.add(n.cle)
        change = true
      }
    }
    if (change) memoriserOuverts()
  }

  function itemGauche(noeud, profondeur) {
    const li = element('li', { 'data-cle': noeud.cle })
    const cible = cibleGauche(noeud)
    const sous = pagesEnfants(noeud)
    const ligne = element('div', { class: 'ag-ligne' })
    const titre = cible
      ? element('a', { class: `ag-lien${noeud.masquee ? ' ag-masquee' : ''}`, href: cible, texte: noeud.titre, title: noeud.masquee ? 'Hors du menu du site' : null })
      : element('span', { class: 'ag-lien ag-inactif', texte: noeud.titre, title: 'Page .mdx : son contenu ne se modifie pas dans l’interface' })
    titre.style.setProperty('--retrait', `${34 + profondeur * 14}px`)
    if (cible && adresseCourante() === cible) titre.setAttribute('aria-current', 'page')
    ligne.append(titre)
    li.append(ligne)
    if (sous.length) {
      const ouvert = ouverts.has(noeud.cle)
      ligne.append(element('button', { type: 'button', class: 'ag-bascule', 'data-cle': noeud.cle, 'aria-expanded': String(ouvert), 'aria-label': `${ouvert ? 'Replier' : 'Déplier'} « ${noeud.titre} »` }))
      if (ouvert) li.append(element('ul', {}, ...sous.map((e) => itemGauche(e, profondeur + 1))))
    }
    return li
  }

  let gauche = null
  function rendreGauche() {
    const { sections, generales } = sectionsEtGenerales(arbre)
    const nouveau = element(
      'ul',
      { id: 'arbre-gauche', 'aria-label': 'Pages du site' },
      ...sections.map((n) => itemGauche(n, 0)),
      generales.length ? element('li', { class: 'ag-separateur', role: 'presentation' }) : null,
      ...generales.map((n) => {
        const li = itemGauche({ ...n, enfants: [] }, 0)
        li.classList.add('ag-generale')
        return li
      }),
    )
    nouveau.addEventListener('click', (e) => {
      const bouton = e.target.closest?.('.ag-bascule')
      if (!bouton) return
      const cle = bouton.dataset.cle
      if (ouverts.has(cle)) ouverts.delete(cle)
      else ouverts.add(cle)
      memoriserOuverts()
      rendreGauche()
      gauche?.querySelector(`.ag-bascule[data-cle="${CSS.escape(cle)}"]`)?.focus()
    })
    if (gauche?.isConnected) gauche.replaceWith(nouveau)
    gauche = nouveau
  }

  /** Place l'arbre après le lien « Pages » de Decap (que React peut recréer) */
  function placerGauche() {
    const pages = document.querySelector(`${LISTE_DECAP} > a[data-testid="/"]`)
    if (!pages) return
    if (!gauche) rendreGauche()
    if (gauche.parentElement !== pages.parentElement || gauche.previousElementSibling !== pages) pages.after(gauche)
  }

  let derniereAdresse = null
  function suivreAdresseGauche() {
    if (location.hash === derniereAdresse) return
    derniereAdresse = location.hash
    deplierChemin()
    rendreGauche()
  }

  // ------------------------------------------------ Affichage selon l'adresse

  /** Portée de l'adresse : null (toutes les pages), un nœud (dossier ouvert), ou undefined (liste de Decap) */
  function porteeCourante() {
    const m = location.hash.match(/^#\/collections\/pages(?:\/filter\/([^?]*?))?\/?(?:\?.*)?$/)
    if (!m) return undefined
    if (!m[1]) return null
    try {
      return parDossier.get(decodeURIComponent(m[1])) ?? undefined
    } catch {
      return undefined
    }
  }

  function synchroniser() {
    suivreAdresseGauche()
    placerGauche()
    const nouvelle = porteeCourante()
    const main = document.querySelector('main')
    if (nouvelle === undefined || !main?.firstElementChild) {
      delete document.body.dataset.vueOrdre
      vue?.remove()
      return
    }
    document.body.dataset.vueOrdre = ''
    if (!vue) {
      portee = nouvelle
      vue = construireVue()
      majAuPlacement = true
    } else if (nouvelle !== portee) {
      portee = nouvelle
      rendre()
    }
    if (vue.parentElement !== main || vue.previousElementSibling !== main.firstElementChild) main.firstElementChild.after(vue)
    if (majAuPlacement) {
      majAuPlacement = false
      majNumeros()
    }
    // Même largeur que le bandeau de Decap (titre et « + Page »)
    const largeur = `${main.firstElementChild.getBoundingClientRect().width}px`
    if (vue.style.maxWidth !== largeur) vue.style.maxWidth = largeur
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
  addEventListener('hashchange', planifier)
  addEventListener('resize', planifier)
  addEventListener('beforeunload', (e) => {
    if (changements.size) e.preventDefault()
  })
  planifier()
}
