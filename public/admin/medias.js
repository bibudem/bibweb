/*
 * Médiathèque du dépôt, à la place de la vue « Media » de Decap : celle-ci ne
 * liste qu'un dossier global (public/televersements, vide) sans ses
 * sous-dossiers, alors que les images du site sont rangées à côté des
 * contenus. Données : medias.json (src/pages/admin/medias.json.ts), générées
 * au build.
 *
 * Toutes les images, regroupées par dossier, avec recherche, filtre
 * (utilisées ou non), vignette, dimensions, poids, chemin à copier et pages
 * qui les utilisent (liens vers l'éditeur). « Importer une image » l'ajoute
 * dans un dossier d'images existant (même enregistrement que le reste de
 * l'interface : fichier en local, commit en ligne). Une image trop lourde
 * (plus de LIMITE_POIDS) ou d'un autre format est refusée avec un message :
 * les images du site font de 50 à 450 Ko en WebP.
 *
 * Le bouton « Media » de l'en-tête est intercepté (phase de capture, avant
 * React) ; la médiathèque de Decap reste celle des champs Image de l'éditeur.
 */

import { choisirStockage } from './ordre-pages.js'
import { slug } from './arborescence.js'

/** Poids maximal d'une image importée */
const LIMITE_POIDS = 1024 * 1024
const FORMATS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg' }

const STYLE = `
.md-dialogue { width: min(1240px, calc(100vw - 32px)); height: min(860px, calc(100vh - 32px)); max-width: none; max-height: none; padding: 0; border: 0; border-radius: var(--rayon-carte, 12px); background: var(--couleur-fond, #f8fafb); color: var(--couleur-texte, #0b113a); font-family: var(--police-sans, sans-serif); font-size: 14px; box-shadow: var(--ombre-2); overflow: hidden; }
.md-dialogue[open] { display: flex; flex-direction: column; }
.md-dialogue::backdrop { background: rgb(11 17 58 / 45%); }
.md-entete { display: flex; align-items: center; gap: 12px; padding: 18px 24px; background: var(--couleur-surface, #fff); box-shadow: var(--ombre-1); position: relative; z-index: 1; }
.md-entete h2 { margin: 0; font-size: var(--texte-tres-grand, 1.5rem); font-weight: var(--graisse-forte, 600); }
.md-compte { margin: 0; color: var(--couleur-texte-secondaire, #4a5160); }
.md-fermer { margin-left: auto; width: 40px; height: 40px; border: 0; border-radius: var(--rayon-plein, 9999px); background: var(--couleur-teinte, #e5eef7); color: var(--couleur-texte, #0b113a); font-size: 22px; line-height: 1; cursor: pointer; }
.md-fermer:hover { background: var(--couleur-teinte-forte, #cce2f3); }
.md-outils { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 20px; padding: 14px 24px; background: var(--couleur-surface, #fff); border-top: 1px solid var(--couleur-teinte, #e5eef7); }
.md-outils label { display: flex; flex-direction: column; gap: 4px; font-weight: var(--graisse-forte, 600); font-size: 13px; }
.md-outils input, .md-outils select { min-height: 40px; padding: 0 12px; border: 1px solid var(--couleur-bordure, #c3ccd5); border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-surface, #fff); color: var(--couleur-texte, #0b113a); font: inherit; font-weight: var(--graisse-moyenne, 500); }
.md-outils input { width: min(360px, 70vw); }
.md-aide { flex: 1 1 260px; margin: 0; color: var(--couleur-texte-secondaire, #4a5160); line-height: 1.45; }
.md-corps { flex: 1; display: grid; grid-template-columns: 1fr; min-height: 0; }
.md-corps.md-avec-detail { grid-template-columns: 1fr 340px; }
.md-liste { overflow: auto; padding: 8px 24px 24px; }
.md-groupe h3 { position: sticky; top: -8px; z-index: 1; margin: 0 -24px; padding: 14px 24px 8px; background: var(--couleur-fond, #f8fafb); font-family: var(--police-serif, Georgia, serif); font-size: 1.125rem; font-weight: var(--graisse-normale, 400); }
.md-groupe h3 span { font-family: var(--police-sans, sans-serif); font-size: 13px; color: var(--couleur-texte-secondaire, #4a5160); }
.md-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin: 0 0 8px; padding: 0; list-style: none; }
.md-carte { display: flex; flex-direction: column; width: 100%; height: 100%; padding: 0; border: 2px solid transparent; border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-surface, #fff); box-shadow: var(--ombre-1); color: inherit; font: inherit; text-align: left; cursor: pointer; overflow: hidden; }
.md-carte:hover { border-color: var(--couleur-teinte-forte, #cce2f3); }
.md-carte[aria-current="true"] { border-color: var(--couleur-accent, #0057ac); }
.md-carte img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; background: var(--couleur-teinte, #e5eef7); }
.md-carte-texte { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 10px; min-width: 0; }
.md-nom { font-weight: var(--graisse-forte, 600); font-size: 13px; overflow-wrap: anywhere; }
.md-meta { color: var(--couleur-texte-secondaire, #4a5160); font-size: 12px; }
.md-badge { align-self: flex-start; margin-top: 4px; padding: 1px 8px; border-radius: var(--rayon-plein, 9999px); background: var(--couleur-teinte, #e5eef7); color: var(--couleur-texte, #0b113a); font-size: 12px; font-weight: var(--graisse-forte, 600); }
.md-badge.md-libre { background: var(--alerte-avertissement-fond, #ffe0c2); color: var(--rouge-orange-texte-sur-clair, #b33410); }
.md-vide { padding: 40px 0; text-align: center; color: var(--couleur-texte-secondaire, #4a5160); font-size: 16px; }
.md-detail { overflow: auto; padding: 20px; background: var(--couleur-surface, #fff); border-left: 1px solid var(--couleur-teinte, #e5eef7); }
.md-detail[hidden] { display: none; }
.md-detail img { display: block; width: 100%; max-height: 260px; object-fit: contain; border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-teinte, #e5eef7); }
.md-detail h3 { margin: 14px 0 4px; font-size: var(--texte-grand, 1.25rem); font-weight: var(--graisse-forte, 600); overflow-wrap: anywhere; }
.md-detail h3:focus { outline: none; }
.md-detail h4 { margin: 18px 0 6px; font-size: 13px; font-weight: var(--graisse-grasse, 700); text-transform: uppercase; letter-spacing: .03em; color: var(--couleur-texte-secondaire, #4a5160); }
.md-detail p { margin: 0 0 6px; line-height: 1.45; }
.md-detail code { display: block; padding: 8px 10px; border-radius: var(--rayon-minuscule, 4px); background: var(--couleur-fond, #f8fafb); font-size: 12px; overflow-wrap: anywhere; }
.md-detail ul { margin: 0; padding-left: 18px; line-height: 1.5; }
.md-detail a { color: var(--couleur-lien, #0057ac); }
.md-detail a:hover { color: var(--couleur-lien-survol, #003c78); }
.md-boutons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.md-bouton { display: inline-flex; align-items: center; min-height: 36px; padding: 0 16px; border: 2px solid var(--couleur-fond-fort, #0b113a); border-radius: var(--rayon-plein, 9999px); background: transparent; color: var(--couleur-fond-fort, #0b113a) !important; font: inherit; font-weight: var(--graisse-forte, 600); text-decoration: none; cursor: pointer; }
.md-bouton:hover { background: var(--couleur-teinte, #e5eef7); }
.md-etat { min-height: 1.2em; margin-top: 6px !important; color: var(--vert-fonce, #024244); font-weight: var(--graisse-forte, 600); }
.md-importer { min-height: 40px; padding: 0 20px; border: 2px solid var(--couleur-fond-fort, #0b113a); border-radius: var(--rayon-plein, 9999px); background: var(--couleur-fond-fort, #0b113a); color: var(--couleur-sur-fonce, #fff); font: inherit; font-weight: var(--graisse-forte, 600); cursor: pointer; }
.md-importer:hover { border-color: var(--couleur-fond-fort-survol, #0057ac); background: var(--couleur-fond-fort-survol, #0057ac); }
.md-import { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 20px; padding: 14px 24px 16px; background: var(--couleur-teinte, #e5eef7); }
.md-import[hidden] { display: none; }
.md-import label { display: flex; flex-direction: column; gap: 4px; font-weight: var(--graisse-forte, 600); font-size: 13px; }
.md-import select, .md-import input[type="file"] { min-height: 40px; padding: 6px 10px; border: 1px solid var(--couleur-bordure, #c3ccd5); border-radius: var(--rayon-tres-petit, 8px); background: var(--couleur-surface, #fff); color: var(--couleur-texte, #0b113a); font: inherit; font-weight: var(--graisse-moyenne, 500); }
.md-import select { max-width: 340px; }
.md-import-aide { flex-basis: 100%; margin: 0; color: var(--couleur-texte-secondaire, #4a5160); line-height: 1.45; }
.md-message { flex-basis: 100%; margin: 0; padding: 10px 14px; border-left: 4px solid; border-radius: 0 var(--rayon-tres-petit, 8px) var(--rayon-tres-petit, 8px) 0; font-weight: var(--graisse-moyenne, 500); line-height: 1.45; }
.md-message:empty { display: none; }
.md-message[data-type="erreur"] { border-color: var(--alerte-erreur-icone, #b10000); background: var(--alerte-erreur-fond, #fee1de); color: var(--couleur-texte, #0b113a); }
.md-message[data-type="succes"] { border-color: var(--alerte-succes-icone, #024244); background: var(--alerte-succes-fond, #d6f0e2); color: var(--couleur-texte, #0b113a); }
.md-message[data-type="info"] { border-color: var(--alerte-info-icone, #0057ac); background: var(--couleur-surface, #fff); }
.md-badge.md-nouvelle { background: var(--alerte-succes-fond, #d6f0e2); color: var(--vert-fonce, #024244); }
.md-dialogue :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 2px; }
@media (max-width: 800px) { .md-corps.md-avec-detail { grid-template-columns: 1fr; } .md-detail { border-left: 0; border-top: 1px solid var(--couleur-teinte, #e5eef7); } }
`

const poidsLisible = (o) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`)
const normaliser = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

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

export function installerMediatheque() {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.append(style)

  let images = null
  let dialogue = null

  async function charger() {
    if (images) return images
    const reponse = await fetch('./medias.json')
    if (!reponse.ok) throw new Error(`medias.json : ${reponse.status}`)
    images = (await reponse.json()).images
    for (const image of images) image.recherche = normaliser([image.nom, image.chemin, image.libelle, ...image.utilisations.map((u) => u.titre)].join(' '))
    return images
  }

  function carte(image) {
    const n = image.utilisations.length
    return element(
      'li',
      {},
      element(
        'button',
        { type: 'button', class: 'md-carte', 'data-chemin': image.chemin, 'aria-current': 'false' },
        element('img', { src: image.vignette, alt: '', loading: 'lazy', decoding: 'async', width: '360', height: '270' }),
        element(
          'span',
          { class: 'md-carte-texte' },
          element('span', { class: 'md-nom', texte: image.nom }),
          element('span', { class: 'md-meta', texte: [image.largeur && `${image.largeur} × ${image.hauteur}`, image.poids && poidsLisible(image.poids)].filter(Boolean).join(' · ') }),
          image.nouvelle
            ? element('span', { class: 'md-badge md-nouvelle', texte: 'Importée' })
            : element('span', { class: `md-badge${n ? '' : ' md-libre'}`, texte: n ? `Utilisée ${n} fois` : 'Non utilisée' }),
        ),
      ),
    )
  }

  function detail(image) {
    const n = image.utilisations.length
    const etat = element('p', { class: 'md-etat', role: 'status', 'aria-live': 'polite' })
    const copier = element('button', { type: 'button', class: 'md-bouton', texte: 'Copier le chemin' })
    copier.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(image.chemin)
        etat.textContent = 'Chemin copié.'
      } catch {
        etat.textContent = 'Copie impossible : sélectionnez le chemin ci-dessus.'
      }
    })
    const titre = element('h3', { tabindex: '-1', texte: image.nom })
    const contenu = [
      element('img', { src: image.grande, alt: `Aperçu de ${image.nom}` }),
      titre,
      element('p', { class: 'md-meta', texte: [image.largeur && `${image.largeur} × ${image.hauteur} px`, image.poids && poidsLisible(image.poids), image.libelle].filter(Boolean).join(' · ') }),
      element('h4', { texte: 'Chemin dans le dépôt' }),
      element('code', { texte: image.chemin }),
      image.banniere ? element('p', { texte: `Bannière : choisir « ${image.banniere} » dans le champ Image de la bannière d’une page.` }) : null,
      element('div', { class: 'md-boutons' }, copier, element('a', { class: 'md-bouton', href: image.grande, target: '_blank', rel: 'noopener', texte: 'Ouvrir l’image ↗' })),
      etat,
      element('h4', { texte: n ? `Utilisée dans (${n})` : 'Utilisation' }),
      n
        ? element('ul', {}, ...image.utilisations.map((u) => element('li', {}, u.entree ? element('a', { href: u.entree, 'data-fermer': '', texte: u.titre }) : element('span', { texte: u.titre }))))
        : element('p', { texte: image.nouvelle ? 'Importée à l’instant. Pour l’afficher, choisissez-la dans le champ Image d’une page (ou collez son chemin).' : 'Aucune page ni donnée ne l’utilise. Elle peut être retirée du dépôt, après vérification.' }),
    ]
    return { contenu, titre }
  }

  /** Raison de refuser un fichier (format, poids), ou null */
  function refuser(fichier) {
    if (!FORMATS[fichier.type]) return `« ${fichier.name} » n’est pas une image acceptée (JPEG, PNG, WebP, AVIF, GIF ou SVG).`
    if (fichier.size > LIMITE_POIDS)
      return `« ${fichier.name} » est trop lourde : ${poidsLisible(fichier.size)}, pour ${poidsLisible(LIMITE_POIDS)} au plus. Réduisez-la (format WebP, 2400 px de large au plus, par exemple avec Squoosh) puis importez-la de nouveau.`
    if (fichier.size === 0) return `« ${fichier.name} » est vide.`
    return null
  }

  const lireBase64 = (fichier) =>
    new Promise((resoudre, rejeter) => {
      const lecteur = new FileReader()
      lecteur.onload = () => resoudre(String(lecteur.result).split(',')[1])
      lecteur.onerror = () => rejeter(new Error('lecture du fichier impossible.'))
      lecteur.readAsDataURL(fichier)
    })

  const dimensions = (url) =>
    new Promise((resoudre) => {
      const img = new Image()
      img.onload = () => resoudre({ largeur: img.naturalWidth || null, hauteur: img.naturalHeight || null })
      img.onerror = () => resoudre({ largeur: null, hauteur: null })
      img.src = url
    })

  async function importer(fichier, dossier) {
    const extension = FORMATS[fichier.type]
    const base = slug(fichier.name.replace(/\.[^.]+$/, '')) || 'image'
    const pris = new Set(images.map((i) => i.chemin))
    let nom = `${base}.${extension}`
    for (let n = 2; pris.has(`${dossier}/${nom}`); n++) nom = `${base}-${n}.${extension}`
    const chemin = `${dossier}/${nom}`
    const base64 = await lireBase64(fichier)
    const stockage = await choisirStockage()
    await stockage.appliquer([{ chemin, base64, creer: true }], `Médiathèque : ajout de « ${nom} »`)
    const url = URL.createObjectURL(fichier)
    const modele = images.find((i) => i.dossier === dossier)
    const image = {
      chemin,
      nom,
      dossier,
      libelle: modele?.libelle ?? dossier,
      rang: modele?.rang ?? 1,
      ...(await dimensions(url)),
      poids: fichier.size,
      vignette: url,
      grande: url,
      banniere: modele?.banniere ? nom.replace(/\.[^.]+$/, '') : null,
      utilisations: [],
      nouvelle: true,
      enLigne: stockage.enLigne,
    }
    image.recherche = normaliser([image.nom, image.chemin, image.libelle].join(' '))
    // Dans son groupe, en tête
    const position = images.findIndex((i) => i.dossier === dossier)
    images.splice(position < 0 ? images.length : position, 0, image)
    return image
  }

  function construire() {
    const recherche = element('input', { type: 'search', placeholder: 'Nom, dossier, page…', autocomplete: 'off' })
    const filtre = element('select', {}, element('option', { value: '', texte: 'Toutes les images' }), element('option', { value: 'utilisees', texte: 'Utilisées' }), element('option', { value: 'libres', texte: 'Non utilisées' }))
    const compte = element('p', { class: 'md-compte', role: 'status', 'aria-live': 'polite' })
    const boutonImporter = element('button', { type: 'button', class: 'md-importer', 'aria-expanded': 'false', 'aria-controls': 'md-import', texte: 'Importer une image' })
    const dossiers = [...new Map(images.map((i) => [i.dossier, i.libelle]))]
    const choixDossier = element('select', {}, ...dossiers.map(([dossier, libelle]) => element('option', { value: dossier, texte: `${libelle} — ${dossier.replace(/^src\/content\//, '')}` })))
    choixDossier.value = dossiers.some(([d]) => d === 'src/content/pages/images') ? 'src/content/pages/images' : dossiers[0]?.[0]
    const choixFichier = element('input', { type: 'file', accept: Object.keys(FORMATS).join(',') })
    const envoyer = element('button', { type: 'button', class: 'md-importer', texte: 'Importer' })
    const message = element('p', { class: 'md-message', role: 'alert' })
    const panneauImport = element(
      'div',
      { class: 'md-import', id: 'md-import', hidden: true },
      element('label', {}, 'Dossier', choixDossier),
      element('label', {}, 'Image', choixFichier),
      envoyer,
      element('p', { class: 'md-import-aide', texte: `JPEG, PNG, WebP, AVIF, GIF ou SVG, ${poidsLisible(LIMITE_POIDS)} au plus (de préférence en WebP, 2400 px de large au plus). Le nom du fichier est nettoyé : minuscules, sans accents ni espaces.` }),
      message,
    )
    const liste = element('div', { class: 'md-liste' })
    const panneau = element('aside', { class: 'md-detail', hidden: true, 'aria-label': 'Détail de l’image' })
    const corps = element('div', { class: 'md-corps' }, liste, panneau)
    const fermer = element('button', { type: 'button', class: 'md-fermer', 'aria-label': 'Fermer la médiathèque', texte: '×' })
    const boite = element(
      'dialog',
      { class: 'md-dialogue', 'aria-labelledby': 'md-titre' },
      element('div', { class: 'md-entete' }, element('h2', { id: 'md-titre', texte: 'Médiathèque' }), compte, fermer),
      element(
        'div',
        { class: 'md-outils' },
        element('label', {}, 'Rechercher', recherche),
        element('label', {}, 'Afficher', filtre),
        element('p', { class: 'md-aide', texte: 'Images du dépôt, rangées à côté des pages. Choisissez une image pour voir son chemin et les pages qui l’utilisent.' }),
        boutonImporter,
      ),
      panneauImport,
      corps,
    )

    function afficher() {
      const terme = normaliser(recherche.value.trim())
      const visibles = images.filter((i) => (!terme || i.recherche.includes(terme)) && (!filtre.value || (filtre.value === 'libres') === !i.utilisations.length))
      const groupes = new Map()
      for (const image of visibles) groupes.set(image.libelle, [...(groupes.get(image.libelle) ?? []), image])
      liste.replaceChildren(
        ...(visibles.length
          ? [...groupes].map(([libelle, liste]) => element('section', { class: 'md-groupe', 'aria-label': libelle }, element('h3', {}, `${libelle} `, element('span', { texte: `(${liste.length})` })), element('ul', { class: 'md-grille' }, ...liste.map(carte))))
          : [element('p', { class: 'md-vide', texte: 'Aucune image ne correspond.' })]),
      )
      compte.textContent = visibles.length === images.length ? `${images.length} images` : `${visibles.length} sur ${images.length} images`
    }

    function selectionner(image) {
      const bouton = liste.querySelector(`.md-carte[data-chemin="${CSS.escape(image.chemin)}"]`)
      liste.querySelectorAll('.md-carte[aria-current="true"]').forEach((b) => b.setAttribute('aria-current', 'false'))
      bouton?.setAttribute('aria-current', 'true')
      bouton?.scrollIntoView({ block: 'nearest' })
      const { contenu } = detail(image)
      panneau.replaceChildren(...contenu.filter(Boolean))
      panneau.hidden = false
      corps.classList.add('md-avec-detail')
    }

    const signaler = (texte, type) => {
      message.textContent = texte
      message.dataset.type = type
    }

    boutonImporter.addEventListener('click', () => {
      panneauImport.hidden = !panneauImport.hidden
      boutonImporter.setAttribute('aria-expanded', String(!panneauImport.hidden))
      if (!panneauImport.hidden) choixFichier.focus()
    })
    // Contrôle dès le choix du fichier : un fichier trop lourd est signalé tout de suite
    choixFichier.addEventListener('change', () => {
      const fichier = choixFichier.files?.[0]
      const refus = fichier && refuser(fichier)
      if (refus) signaler(refus, 'erreur')
      else signaler('', '')
    })
    envoyer.addEventListener('click', async () => {
      const fichier = choixFichier.files?.[0]
      if (!fichier) return signaler('Choisissez d’abord une image.', 'erreur')
      const refus = refuser(fichier)
      if (refus) return signaler(refus, 'erreur')
      envoyer.disabled = true
      signaler(`Import de « ${fichier.name} »…`, 'info')
      try {
        const image = await importer(fichier, choixDossier.value)
        recherche.value = ''
        filtre.value = ''
        afficher()
        selectionner(image)
        choixFichier.value = ''
        signaler(
          `« ${image.nom} » est importée dans ${image.dossier}.${image.banniere ? ' Elle sera proposée dans le champ Image des bannières après la reconstruction du site.' : ''}${image.enLigne ? ' En ligne : un commit ; le site sera à jour après sa reconstruction.' : ''}`,
          'succes',
        )
      } catch (erreur) {
        console.error('Import d’image', erreur)
        signaler(`Échec de l’import : ${erreur.message} Rien n’a été ajouté.`, 'erreur')
      } finally {
        envoyer.disabled = false
      }
    })

    recherche.addEventListener('input', afficher)
    filtre.addEventListener('change', afficher)
    fermer.addEventListener('click', () => boite.close())
    liste.addEventListener('click', (e) => {
      const bouton = e.target.closest('.md-carte')
      if (!bouton) return
      const image = images.find((i) => i.chemin === bouton.dataset.chemin)
      liste.querySelectorAll('.md-carte[aria-current="true"]').forEach((b) => b.setAttribute('aria-current', 'false'))
      bouton.setAttribute('aria-current', 'true')
      const { contenu, titre } = detail(image)
      panneau.replaceChildren(...contenu.filter(Boolean))
      panneau.hidden = false
      corps.classList.add('md-avec-detail')
      titre.focus()
    })
    // Lien vers une page : la médiathèque se ferme, l'éditeur s'ouvre
    panneau.addEventListener('click', (e) => {
      if (e.target.closest('a[data-fermer]')) boite.close()
    })
    document.body.append(boite)
    return { boite, afficher, recherche }
  }

  async function ouvrir() {
    try {
      await charger()
    } catch (erreur) {
      console.error('Médiathèque', erreur)
      alert('La médiathèque n’a pas pu être chargée.')
      return
    }
    if (!dialogue) {
      dialogue = construire()
      dialogue.afficher()
    }
    dialogue.boite.showModal()
    dialogue.recherche.focus()
  }

  // Bouton « Media » de l'en-tête de Decap (le lien « Contenus » est un <a>)
  addEventListener(
    'click',
    (e) => {
      const bouton = e.target.closest?.('header button[class*="-AppHeaderButton"]')
      if (!bouton) return
      e.preventDefault()
      e.stopImmediatePropagation()
      ouvrir()
    },
    true,
  )
}
