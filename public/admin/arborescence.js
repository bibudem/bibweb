/*
 * Collection « Pages » de Decap (imbriquée : voir src/pages/admin/config.yml.ts),
 * avec les données de arborescence.json (src/pages/admin/arborescence.json.ts) :
 *
 * - titre de la liste du dossier ouvert (« Pages › À propos ») ;
 * - garde-fou à l'enregistrement (preSave) : Decap tire le nom d'une nouvelle
 *   page de son titre et écrit par-dessus un fichier du même nom sans
 *   prévenir ; un changement d'emplacement déplacerait la page (liens
 *   cassés). Les deux sont refusés avec un message.
 *
 * Le menu de gauche et la liste des pages sont dans ordre-pages.js.
 */

import { installerVueOrdre } from './ordre-pages.js'
import { installerApercu } from './apercu.js'

const COLLECTION = 'pages'
const RACINE = 'src/content/pages/'

/** Identifiant de page approché d'après un titre, comme id-de-page.mjs (slugify) */
export function slug(texte) {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/þ/g, 'th')
    .replace(/[øłđð]/g, (lettre) => ({ ø: 'o', ł: 'l', đ: 'd', ð: 'd' })[lettre])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Identifiant (adresse) qu'aura une nouvelle page : dossier + titre */
function idDeNouvellePage(entry) {
  const emplacement = entry.getIn(['meta', 'path']) || '/'
  const dossier = emplacement === '/' ? '' : emplacement.replace(/^\/+|\/+$/g, '')
  return { dossier, id: [dossier, slug(entry.getIn(['data', 'title']) || '')].filter(Boolean).join('/') }
}

/** `existants` : adresses prises, partagées avec ordre-pages.js (copies, suppressions) */
function gardeFou(existants) {

  const avantEnregistrement = ({ entry }) => {
    if (entry.get('collection') !== COLLECTION) return
    const { dossier, id } = idDeNouvellePage(entry)

    if (entry.get('newRecord')) {
      if (existants.has(id)) {
        throw new Error(`L’adresse /${id}/ est déjà celle d’une page. Changez le titre de la nouvelle page (on peut le remettre après l’enregistrement) ou son emplacement.`)
      }
      return
    }

    const chemin = entry.get('path') || ''
    const dossierActuel = chemin.startsWith(RACINE) ? chemin.slice(RACINE.length).split('/').slice(0, -1).join('/') : dossier
    if (dossierActuel !== dossier) {
      throw new Error('Une page existante ne change pas d’emplacement depuis l’interface de rédaction (ses liens seraient cassés). Remettez l’emplacement d’origine ; un déplacement se fait dans le dépôt.')
    }
  }

  // Page créée : son adresse est prise jusqu'au prochain chargement de
  // arborescence.json (sinon une 2e création du même titre l'écraserait)
  const apresEnregistrement = ({ entry }) => {
    if (entry.get('collection') !== COLLECTION || !entry.get('newRecord')) return
    existants.add(idDeNouvellePage(entry).id)
  }

  return { avantEnregistrement, apresEnregistrement }
}

/*
 * Titre de la liste : « Pages › À propos › Carrière » quand un dossier est
 * ouvert. Le titre appartient à React : on n'y touche pas, une règle CSS
 * ajoute la suite d'après l'attribut data-dossier du body (adresse courante).
 */
function titreDuDossier(dossiers) {
  const css = dossiers
    .filter(({ chemin }) => chemin !== '/')
    .map(({ chemin, libelle }) => `body[data-dossier=${JSON.stringify(chemin)}] h1[class*="CollectionTopHeading"]::after { content: ${JSON.stringify(' › ' + libelle)}; }`)
    .join('\n')
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
}

/** Dossier ouvert (attribut data-dossier du body), pour le titre de la liste */
function suivreDossier() {
  const suivre = () => {
    const ouverte = location.hash.match(/^#\/collections\/pages(?:\/filter\/([^?]*))?/)
    let dossier = ''
    try {
      dossier = ouverte?.[1] ? decodeURIComponent(ouverte[1]).replace(/\/+$/, '') : ''
    } catch {
      dossier = ''
    }
    document.body.dataset.dossier = dossier
  }
  addEventListener('hashchange', suivre)
  suivre()
}

/** `YAML` : la bibliothèque yaml (v2), pour la vue « Ordre des pages » */
export async function preparerArborescence(CMS, YAML) {
  try {
    const reponse = await fetch('./arborescence.json')
    if (!reponse.ok) throw new Error(`arborescence.json : ${reponse.status}`)
    const donnees = await reponse.json()
    const { dossiers, ids } = donnees
    titreDuDossier(dossiers)
    suivreDossier()
    const pris = new Set(ids)
    installerVueOrdre(donnees, YAML, pris)
    installerApercu(donnees.apercus ?? {})
    const { avantEnregistrement, apresEnregistrement } = gardeFou(pris)
    CMS.registerEventListener({ name: 'preSave', handler: avantEnregistrement })
    CMS.registerEventListener({ name: 'postSave', handler: apresEnregistrement })
  } catch (erreur) {
    // L'interface reste utilisable : menu et liste de Decap, sans garde-fou
    console.error('Arborescence des pages non chargée', erreur)
  }
}
