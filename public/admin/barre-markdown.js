/*
 * Barre de mise en forme du champ Contenu (Markdown brut).
 *
 * Le corps des pages s'édite en Markdown brut (config.yml.ts : l'éditeur
 * visuel de Decap réécrirait les blocs du site, :::liens, ::bouton…) ; dans
 * ce mode, Decap désactive tous les boutons de sa barre. Celle-ci les
 * remplace : chaque bouton insère la syntaxe Markdown au curseur, sans jamais
 * réécrire le reste du texte, et « Blocs du site » insère des modèles
 * valides (vocabulaire de src/plugins/directives.mjs).
 *
 * L'insertion est un « coller » de texte brut à la sélection : l'éditeur de
 * Decap (Slate) le traite comme un collage au clavier (une seule opération,
 * Ctrl+Z l'annule d'un coup) et la fiche passe en « modifications non
 * enregistrées ». Les boutons ne prennent pas le focus (mousedown), pour
 * garder la sélection dans le texte. Voir « Édition » plus bas.
 *
 * Les blocs qui exigent une image existante (image-texte, galerie, logos)
 * n'ont pas de modèle : un chemin fictif ferait échouer le build. Le bouton
 * Image accepte le chemin copié dans la médiathèque (src/content/…) et le
 * rend relatif à la page.
 */

const STYLE = `
/* Barre de Decap (désactivée en Markdown brut) : dans RawEditorContainer >
   EditorControlBar. La nôtre prend sa place, fixe en tête du champ : collante,
   elle se posait par-dessus le texte pendant le défilement. z-index : ses
   menus passent au-dessus du texte. */
.cms-editor-raw [class*='-EditorControlBar'] { display: none !important; }
/* Decap compense la marge basse (100 px) de sa barre par une marge haute de
   −100 px sur le texte : sa barre masquée, le texte remontait sous la nôtre */
.cms-editor-raw [data-slate-editor] { margin-top: 0 !important; }
.bm-barre { position: relative; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px 8px; background: var(--couleur-teinte, #e5eef7); border-radius: var(--rayon-tres-petit, 8px) var(--rayon-tres-petit, 8px) 0 0; font-family: var(--police-sans, sans-serif); }
.bm-bouton { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 34px; height: 34px; padding: 0 8px; border: 0; border-radius: var(--rayon-minuscule, 4px); background: transparent; color: var(--couleur-texte, #0b113a); font: inherit; font-size: 14px; font-weight: var(--graisse-forte, 600); cursor: pointer; }
.bm-bouton:hover, .bm-bouton[aria-expanded="true"] { background: var(--couleur-surface, #fff); color: var(--couleur-lien, #0057ac); }
.bm-bouton svg { width: 18px; height: 18px; fill: currentColor; }
.bm-separateur { width: 1px; height: 22px; margin: 0 6px; background: var(--couleur-bordure, #c3ccd5); }
.bm-blocs { margin-left: auto; padding: 0 12px; border: 2px solid var(--couleur-fond-fort, #0b113a); border-radius: var(--rayon-plein, 9999px); background: var(--couleur-surface, #fff); }
.bm-menu { position: absolute; right: 8px; top: calc(100% + 4px); z-index: 20; display: flex; flex-direction: column; width: min(380px, calc(100vw - 48px)); max-height: 60vh; overflow: auto; padding: 6px; background: var(--couleur-surface, #fff); border-radius: var(--rayon-tres-petit, 8px); box-shadow: var(--ombre-2); }
.bm-menu[hidden] { display: none; }
.bm-menu.bm-titres { right: auto; left: auto; width: 220px; }
.bm-choix { display: block; padding: 8px 10px; border: 0; border-radius: var(--rayon-minuscule, 4px); background: none; color: var(--couleur-texte, #0b113a); font: inherit; text-align: left; cursor: pointer; }
.bm-choix:hover, .bm-choix:focus-visible { background: var(--couleur-teinte, #e5eef7); }
.bm-choix strong { display: block; font-size: 14px; font-weight: var(--graisse-forte, 600); }
.bm-choix span { display: block; margin-top: 2px; color: var(--couleur-texte-secondaire, #4a5160); font-size: 12px; line-height: 1.35; }
.bm-barre :focus-visible { outline: 3px solid var(--couleur-focus, #0057ac); outline-offset: 1px; }
`

// Icônes (Phosphor, 256 × 256), dessinées en currentColor
const ICONES = {
  gras: 'M170.48 115.7A44 44 0 0 0 140 40H72a8 8 0 0 0-8 8v152a8 8 0 0 0 8 8h80a48 48 0 0 0 18.48-92.3ZM80 56h60a28 28 0 0 1 0 56H80Zm72 136H80v-64h72a32 32 0 0 1 0 64Z',
  italique: 'M200 56a8 8 0 0 1-8 8h-34.23l-40 128H152a8 8 0 0 1 0 16H64a8 8 0 0 1 0-16h34.23l40-128H104a8 8 0 0 1 0-16h88a8 8 0 0 1 8 8Z',
  barre: 'M224 128a8 8 0 0 1-8 8h-40.07c9.19 7.11 16.07 17.2 16.07 32 0 13.34-7 25.7-19.15 33.9C161.53 209.7 145.49 214 128 214s-33.53-4.3-44.85-12.1C71 193.7 64 181.34 64 168a8 8 0 0 1 16 0c0 17.35 22 30 48 30s48-12.65 48-30c0-14.85-10.54-23.58-38.77-32H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM76.33 104a8 8 0 0 0 7.61-10.49 17.3 17.3 0 0 1-.83-5.51c0-18.24 19.3-32 44.89-32 18.84 0 34.16 7.42 41 19.85a8 8 0 0 0 14-7.7C173.33 50.52 152.77 40 128 40c-34.71 0-60.89 20.63-60.89 48a33.73 33.73 0 0 0 1.62 10.49 8 8 0 0 0 7.6 5.51Z',
  code: 'M69.12 94.15 28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3Zm176 27.7-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29ZM162.73 32.48a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26 8.14 8.14 0 0 0 2.73.47 8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25Z',
  lien: 'M137.54 186.36a8 8 0 0 1 0 11.31l-9.94 10a56 56 0 0 1-79.22-79.27l24.12-24.12a56 56 0 0 1 76.81-2.28 8 8 0 1 1-10.64 12 40 40 0 0 0-54.85 1.63L59.7 139.72a40 40 0 0 0 56.58 56.58l9.94-9.94a8 8 0 0 1 11.32 0Zm70.08-138a56.08 56.08 0 0 0-79.22 0l-9.94 9.95a8 8 0 0 0 11.32 11.31l9.94-9.94a40 40 0 0 1 56.58 56.58l-24.12 24.14a40 40 0 0 1-54.85 1.6 8 8 0 1 0-10.64 12 56 56 0 0 0 76.81-2.26l24.12-24.12a56.08 56.08 0 0 0 0-79.24Z',
  image: 'M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20-44-44a16 16 0 0 0-22.62 0L40 149.37V56ZM40 172l52-52 80 80H40Zm176 28h-21.37l-36-36 20-20L216 181.38V200Zm-72-100a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z',
  citation: 'M100 56H40a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32 8 8 0 0 0 0 16 48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16Zm0 80H40V72h60ZM216 56h-60a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32 8 8 0 0 0 0 16 48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16Zm0 80h-60V72h60Z',
  puces: 'M80 64a8 8 0 0 1 8-8h128a8 8 0 0 1 0 16H88a8 8 0 0 1-8-8Zm136 56H88a8 8 0 0 0 0 16h128a8 8 0 0 0 0-16Zm0 64H88a8 8 0 0 0 0 16h128a8 8 0 0 0 0-16ZM44 52a12 12 0 1 0 12 12 12 12 0 0 0-12-12Zm0 64a12 12 0 1 0 12 12 12 12 0 0 0-12-12Zm0 64a12 12 0 1 0 12 12 12 12 0 0 0-12-12Z',
  numeros: 'M224 128a8 8 0 0 1-8 8H104a8 8 0 0 1 0-16h112a8 8 0 0 1 8 8ZM104 72h112a8 8 0 0 0 0-16H104a8 8 0 0 0 0 16Zm112 112H104a8 8 0 0 0 0 16h112a8 8 0 0 0 0-16ZM43.58 55.16 48 52.94V104a8 8 0 0 0 16 0V40a8 8 0 0 0-11.58-7.16l-16 8a8 8 0 0 0 7.16 14.32Zm36.19 101.56a23.73 23.73 0 0 0-9.6-15.95 24.86 24.86 0 0 0-34.11 4.7 23.63 23.63 0 0 0-3.57 6.46 8 8 0 1 0 15 5.47 7.84 7.84 0 0 1 1.18-2.13 8.76 8.76 0 0 1 12-1.59A7.91 7.91 0 0 1 63.93 159a7.64 7.64 0 0 1-1.57 5.78 1 1 0 0 0-.08.11L33.59 203.21A8 8 0 0 0 40 216h32a8 8 0 0 0 0-16H56l19.08-25.53a23.47 23.47 0 0 0 4.69-17.75Z',
}

const svg = (nom) => `<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${ICONES[nom]}"/></svg>`

/** Modèles de blocs, valides pour src/plugins/directives.mjs */
const BLOCS = [
  { nom: 'Alerte', aide: 'Message mis en évidence. type : info, succes, attention ou erreur.', texte: ':::alerte{type=info titre="À noter"}\nTexte de l’alerte.\n:::' },
  { nom: 'Bouton', aide: 'Lien en forme de bouton, vers une page du site ou une adresse externe.', texte: '::bouton[Texte du bouton]{lien=/adresse/}' },
  { nom: 'Liste de liens', aide: 'Liens avec une courte description sous chacun.', texte: ':::liens\n- [Titre du lien](/adresse/)\n  Courte description.\n- [Autre lien](/adresse/)\n  Courte description.\n:::' },
  { nom: 'Liens en grille', aide: 'Les mêmes liens, en cartes côte à côte.', texte: ':::liens{forme=grille}\n- [Titre du lien](/adresse/)\n  Courte description.\n- [Autre lien](/adresse/)\n  Courte description.\n:::' },
  { nom: 'Tableau', aide: 'Tableau avec un titre (lu par les lecteurs d’écran).', texte: ':::tableau{titre="Nom du tableau"}\n| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Valeur | Valeur |\n| Valeur | Valeur |\n:::' },
  { nom: 'Accordéon', aide: 'Volets repliables : un titre ### par volet.', texte: ':::accordeon\n### Premier volet\n\nContenu du premier volet.\n\n### Deuxième volet\n\nContenu du deuxième volet.\n:::' },
  { nom: 'Citation', aide: 'Citation avec sa source.', texte: ':::citation{source="Nom, fonction"}\nTexte de la citation.\n:::' },
  { nom: 'Vidéo', aide: 'Vidéo YouTube : son titre entre crochets, son identifiant (11 caractères après watch?v=).', texte: '::video[Titre de la vidéo]{youtube=3cMdFZbivdg}' },
  { nom: 'Chiffres', aide: 'Chiffres clés : un titre #### par groupe, puis 2 ou 3 éléments.', texte: ':::chiffres\n#### Livres\n\n- 1 000 imprimés\n- 2 000 électroniques\n:::' },
  { nom: 'Encadrés', aide: 'Encadrés colorés : un titre #### par encadré.', texte: ':::encadres{fond=bleu10}\n#### Premier encadré\n\nTexte du premier encadré.\n\n#### Deuxième encadré\n\nTexte du deuxième encadré.\n:::' },
]

const TITRES = [
  { niveau: 2, aide: 'Intertitre de section' },
  { niveau: 3, aide: 'Sous-intertitre' },
  { niveau: 4, aide: 'Titre de bloc' },
]

// ------------------------------------------------ Édition
//
// L'éditeur de Decap (Slate) redessine ses lignes après chaque modification :
// un nœud du DOM gardé d'une étape à l'autre peut avoir disparu (« Cannot
// resolve a Slate node from DOM node »). D'où :
// - des positions logiques (numéro de ligne, position dans la ligne),
//   reconverties en points du DOM au moment de s'en servir ;
// - une seule opération par insertion, un « coller » de texte brut : Slate le
//   découpe en lignes lui-même, et Ctrl+Z l'annule d'un coup ;
// - une attente entre la sélection et le collage (DELAI_SELECTION), le temps
//   que Slate lise la sélection du navigateur : il limite l'événement
//   selectionchange à une lecture toutes les 100 ms.

const ZERO = /﻿/g
const attendre = (ms = 30) => new Promise((r) => setTimeout(r, ms))
// Slate lit la sélection du navigateur au plus toutes les 100 ms (selectionchange limité)
const DELAI_SELECTION = 150

const lignesDe = (editeur) => [...editeur.children]

/** Nœuds de texte d'une ligne (sans le caractère de largeur nulle des lignes vides) */
const textesDe = (ligne) => [...ligne.querySelectorAll('[data-slate-string]')].map((s) => s.firstChild).filter(Boolean)
const texteDeLigne = (ligne) => textesDe(ligne).map((t) => t.data).join('').replace(ZERO, '')

/** Ligne (enfant direct de l'éditeur) qui contient le nœud */
function ligneDe(noeud, editeur) {
  let e = noeud?.nodeType === 1 ? noeud : noeud?.parentElement
  while (e && e.parentElement !== editeur) e = e.parentElement
  return e ?? null
}

/** Point du DOM → { ligne, position } */
function versLogique(editeur, noeud, decalage) {
  const ligne = ligneDe(noeud, editeur)
  if (!ligne) return null
  let position = 0
  for (const t of textesDe(ligne)) {
    if (t === noeud) return { ligne: lignesDe(editeur).indexOf(ligne), position: position + t.data.slice(0, decalage).replace(ZERO, '').length }
    position += t.data.replace(ZERO, '').length
  }
  // Point posé sur un élément (ligne vide, fin de ligne)
  return { ligne: lignesDe(editeur).indexOf(ligne), position: decalage > 0 ? position : 0 }
}

/** { ligne, position } → point du DOM (toujours sur un nœud de texte) */
function versDom(editeur, { ligne, position }) {
  const element = lignesDe(editeur)[Math.min(ligne, lignesDe(editeur).length - 1)]
  if (!element) return null
  const textes = textesDe(element)
  let reste = position
  for (const t of textes) {
    const longueur = t.data.replace(ZERO, '').length
    if (reste <= longueur) return { noeud: t, decalage: t.data.startsWith('﻿') ? 1 : reste }
    reste -= longueur
  }
  const dernier = textes.at(-1) ?? element.querySelector('[data-slate-zero-width]')?.firstChild
  return dernier ? { noeud: dernier, decalage: dernier.data.length } : null
}

/** Sélection logique de l'éditeur ; sans sélection dedans : fin du texte */
function selectionLogique(editeur) {
  const sel = getSelection()
  if (sel.rangeCount && editeur.contains(sel.anchorNode)) {
    const plage = sel.getRangeAt(0)
    const debut = versLogique(editeur, plage.startContainer, plage.startOffset)
    const fin = versLogique(editeur, plage.endContainer, plage.endOffset)
    if (debut && fin) return { debut, fin, texte: sel.toString().replace(ZERO, '') }
  }
  const derniere = lignesDe(editeur).length - 1
  const point = { ligne: derniere, position: texteDeLigne(lignesDe(editeur)[derniere]).length }
  return { debut: point, fin: point, texte: '' }
}

/** Applique une sélection logique, puis laisse Slate la lire */
async function selectionner(editeur, debut, fin = debut) {
  editeur.focus()
  const a = versDom(editeur, debut)
  const b = versDom(editeur, fin)
  if (!a || !b) return
  const plage = document.createRange()
  plage.setStart(a.noeud, a.decalage)
  plage.setEnd(b.noeud, b.decalage)
  const sel = getSelection()
  sel.removeAllRanges()
  sel.addRange(plage)
  await attendre(DELAI_SELECTION)
}

/** Colle du texte brut à la place de la sélection : une seule opération pour Slate */
async function coller(editeur, texte) {
  const donnees = new DataTransfer()
  donnees.setData('text/plain', texte)
  editeur.dispatchEvent(new ClipboardEvent('paste', { clipboardData: donnees, bubbles: true, cancelable: true }))
  await attendre()
}

/** Entoure la sélection (ou un texte d'exemple) : **gras**, _italique_… */
async function entourer(editeur, avant, apres, exemple) {
  const { debut, fin, texte } = selectionLogique(editeur)
  await selectionner(editeur, debut, fin)
  // Pas sur plusieurs lignes : la marque ne passe pas les sauts de ligne
  await coller(editeur, `${avant}${texte && !texte.includes('\n') ? texte : exemple}${apres}`)
}

/** Préfixe la ligne du curseur (## , - , 1. , > ), à la place d'un préfixe du même type */
async function prefixer(editeur, prefixe, motif) {
  const { debut } = selectionLogique(editeur)
  const existant = texteDeLigne(lignesDe(editeur)[debut.ligne]).match(motif)?.[0] ?? ''
  await selectionner(editeur, { ligne: debut.ligne, position: 0 }, { ligne: debut.ligne, position: existant.length })
  await coller(editeur, prefixe)
  // Curseur en fin de ligne
  const ligne = lignesDe(editeur)[debut.ligne]
  if (ligne) await selectionner(editeur, { ligne: debut.ligne, position: texteDeLigne(ligne).length })
}

/** Bloc sur ses propres lignes : ligne vide avant si la ligne courante n'est pas vide */
async function insererBloc(editeur, texte) {
  const { debut } = selectionLogique(editeur)
  const ligne = lignesDe(editeur)[debut.ligne]
  const pleine = ligne && texteDeLigne(ligne).trim()
  await selectionner(editeur, { ligne: debut.ligne, position: pleine ? texteDeLigne(ligne).length : debut.position })
  await coller(editeur, `${pleine ? '\n\n' : ''}${texte}\n`)
}

/** Insère du texte à une sélection mémorisée (après une fenêtre de saisie) */
async function insererA(editeur, { debut, fin }, texte) {
  await selectionner(editeur, debut, fin)
  await coller(editeur, texte)
}

// ------------------------------------------------ Chemins d'images

/** Dossier de la fiche ouverte dans src/content (pages, nouvelles), ou null */
function dossierDeFiche() {
  const m = location.hash.match(/^#\/collections\/(pages|nouvelles)\/entries\/([^?]+)/)
  if (!m) return null
  let chemin
  try {
    chemin = decodeURIComponent(m[2])
  } catch {
    return null
  }
  const dossier = chemin.split('/').slice(0, -1).join('/')
  return `src/content/${m[1]}${dossier ? `/${dossier}` : ''}`
}

/** Chemin relatif d'un dossier vers un fichier : « ./images/x.webp », « ../images/x.webp » */
export function cheminRelatif(dossier, fichier) {
  const a = dossier.split('/').filter(Boolean)
  const b = fichier.split('/').filter(Boolean)
  let commun = 0
  while (commun < a.length && commun < b.length - 1 && a[commun] === b[commun]) commun++
  return (a.length - commun ? '../'.repeat(a.length - commun) : './') + b.slice(commun).join('/')
}

// ------------------------------------------------ Barre

function bouton(attributs, contenu) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'bm-bouton'
  for (const [cle, valeur] of Object.entries(attributs)) b.setAttribute(cle, valeur)
  b.innerHTML = contenu
  // Le bouton ne prend pas le focus : la sélection reste dans le texte
  b.addEventListener('mousedown', (e) => e.preventDefault())
  return b
}

function construireBarre(conteneur) {
  const editeur = () => conteneur.querySelector('[data-slate-editor]')
  const barre = document.createElement('div')
  barre.className = 'bm-barre'
  barre.setAttribute('role', 'toolbar')
  barre.setAttribute('aria-label', 'Mise en forme du contenu')

  // Une insertion à la fois : un clic pendant la précédente est ignoré
  let occupe = false
  const executer = async (faire) => {
    const ed = editeur()
    if (!ed || occupe) return
    occupe = true
    try {
      // Slate intègre la frappe au clavier en différé : on le laisse finir
      // avant de lire la sélection, sinon il colle à l'ancienne position
      await attendre()
      await faire(ed)
    } catch (erreur) {
      console.error('Barre de mise en forme', erreur)
    } finally {
      occupe = false
    }
  }
  const action = (titre, icone, faire) => {
    const b = bouton({ title: titre, 'aria-label': titre }, icone)
    b.addEventListener('click', () => executer(faire))
    return b
  }
  const separateur = () => Object.assign(document.createElement('span'), { className: 'bm-separateur' })

  // Menu déroulant (intertitres, blocs)
  let ouvert = null
  const fermer = (rendreFocus) => {
    if (!ouvert) return
    ouvert.menu.hidden = true
    ouvert.bouton.setAttribute('aria-expanded', 'false')
    if (rendreFocus) ouvert.bouton.focus()
    ouvert = null
  }
  const menu = (libelle, contenu, classe, choix) => {
    const declencheur = bouton({ title: libelle, 'aria-haspopup': 'true', 'aria-expanded': 'false' }, contenu)
    if (classe) declencheur.classList.add(classe)
    const liste = document.createElement('div')
    liste.className = `bm-menu${classe === 'bm-titres' ? ' bm-titres' : ''}`
    liste.hidden = true
    for (const { titre, aide, faire } of choix) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'bm-choix'
      item.innerHTML = `<strong></strong><span></span>`
      item.querySelector('strong').textContent = titre
      item.querySelector('span').textContent = aide
      item.addEventListener('mousedown', (e) => e.preventDefault())
      item.addEventListener('click', () => {
        fermer(false)
        executer(faire)
      })
      liste.append(item)
    }
    declencheur.addEventListener('click', () => {
      if (ouvert?.menu === liste) return fermer(false)
      fermer(false)
      liste.hidden = false
      declencheur.setAttribute('aria-expanded', 'true')
      ouvert = { menu: liste, bouton: declencheur }
      // Placé sous son bouton
      liste.style.left = liste.classList.contains('bm-titres') ? `${declencheur.offsetLeft}px` : ''
    })
    barre.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ouvert) {
        e.preventDefault()
        fermer(true)
      }
    })
    return [declencheur, liste]
  }
  document.addEventListener('mousedown', (e) => {
    if (ouvert && !barre.contains(e.target)) fermer(false)
  })

  barre.append(
    action('Gras', svg('gras'), (ed) => entourer(ed, '**', '**', 'texte en gras')),
    action('Italique', svg('italique'), (ed) => entourer(ed, '_', '_', 'texte en italique')),
    action('Barré', svg('barre'), (ed) => entourer(ed, '~~', '~~', 'texte barré')),
    action('Code', svg('code'), (ed) => entourer(ed, '`', '`', 'code')),
    separateur(),
    ...menu(
      'Intertitre',
      'Intertitre <span aria-hidden="true">▾</span>',
      'bm-titres',
      TITRES.map(({ niveau, aide }) => ({ titre: `${'#'.repeat(niveau)} Titre de niveau ${niveau}`, aide, faire: (ed) => prefixer(ed, `${'#'.repeat(niveau)} `, /^#{1,6}\s+/) })),
    ),
    action('Citation', svg('citation'), (ed) => prefixer(ed, '> ', /^>\s?/)),
    action('Liste à puces', svg('puces'), (ed) => prefixer(ed, '- ', /^([-*]|\d+\.)\s+/)),
    action('Liste numérotée', svg('numeros'), (ed) => prefixer(ed, '1. ', /^([-*]|\d+\.)\s+/)),
    separateur(),
    action('Lien', svg('lien'), async (ed) => {
      // La fenêtre de saisie prend le focus : sélection mémorisée (logique), puis rétablie
      const selection = selectionLogique(ed)
      const adresse = prompt('Adresse du lien : une page du site (/obtenir/) ou une adresse complète (https://…)', '/')
      if (!adresse) return selectionner(ed, selection.debut, selection.fin)
      const libelle = selection.texte && !selection.texte.includes('\n') ? selection.texte : 'texte du lien'
      await insererA(ed, selection, `[${libelle}](${adresse.trim()})`)
    }),
    action('Image', svg('image'), async (ed) => {
      const selection = selectionLogique(ed)
      const reponse = prompt('Chemin de l’image. Collez celui copié dans la médiathèque (src/content/…) ou un chemin relatif à la page (./images/photo.webp).', './images/')
      if (!reponse || /\/$/.test(reponse.trim())) return selectionner(ed, selection.debut, selection.fin)
      let chemin = reponse.trim()
      const dossier = dossierDeFiche()
      if (/^src\/content\//.test(chemin) && dossier) chemin = cheminRelatif(dossier, chemin)
      const description = prompt('Texte de remplacement : ce que montre l’image, pour les personnes qui ne la voient pas.', '') ?? ''
      await insererA(ed, selection, `![${description.trim()}](${chemin})`)
    }),
    ...menu(
      'Blocs du site',
      'Blocs du site <span aria-hidden="true">▾</span>',
      'bm-blocs',
      BLOCS.map(({ nom, aide, texte }) => ({ titre: nom, aide, faire: (ed) => insererBloc(ed, texte) })),
    ),
  )
  return barre
}

export function installerBarreMarkdown() {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.append(style)

  const synchroniser = () => {
    for (const conteneur of document.querySelectorAll('.cms-editor-raw')) {
      let barre = conteneur.querySelector(':scope > .bm-barre')
      if (!barre) barre = construireBarre(conteneur)
      // En tête du champ, avant l'éditeur de Decap
      if (conteneur.firstElementChild !== barre) conteneur.prepend(barre)
    }
  }
  let prevu = false
  new MutationObserver(() => {
    if (prevu) return
    prevu = true
    requestAnimationFrame(() => {
      prevu = false
      synchroniser()
    })
  }).observe(document.body, { childList: true, subtree: true })
}
