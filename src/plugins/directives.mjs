import { existsSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { marqueurFermant, marqueurOuvrant } from './marqueurs-directives.mjs'
import { messageIconeInconnue, trouverIcone } from './icones.mjs'

/*
 * Directives des pages Markdown (remark-directive), pour les rares besoins
 * de mise en forme qu'un rédacteur doit pouvoir écrire sans JSX. Vocabulaire
 * et exemples : docs/REDACTION.md.
 *
 * remarkDirectivesBib vérifie chaque directive (nom, attributs, valeurs,
 * icônes, images) et fait échouer le build avec le fichier et la ligne en
 * cas d'erreur ; il marque ensuite les nœuds à rendre par un composant.
 * rehypeDirectivesBib change ces marques, les tableaux, les images et les liens en
 * commentaires que RenduDirectives.astro remplace par les composants du MDX
 * (voir marqueurs-directives.mjs).
 *
 * Ces plugins ne servent qu'aux fichiers .md : dans le MDX, un texte comme
 * « voir:ici » resterait du texte.
 */

const ALERTES = ['info', 'succes', 'attention', 'erreur']

/** Couleurs permises pour :icone[nom]{couleur=…} → jeton de tokens.css */
export const COULEURS_ICONE = {
  texte: 'var(--couleur-texte)',
  neutre700: 'var(--couleur-neutre-700)',
  bleuPrincipal: 'var(--bleu-principal)',
  bleuFonce: 'var(--bleu-fonce)',
  vertFonce: 'var(--vert-fonce)',
  rougeOrange: 'var(--rouge-orange)',
}

const TAILLE_ICONE = { min: 16, max: 64 }

// Fonds clairs ou moyens : texte foncé lisible, icône assombrie d'IconeCarree
// visible (les fonds foncés de Section n'y ont pas leur place)
const FONDS_ICONE_TEXTE = ['vertPale', 'bleu100', 'bleu200', 'jaunePale', 'jaune', 'rose100', 'rose300']
const FONDS_ENCADRES = ['rose300', 'rose100', 'bleu100', 'bleu200', 'jaunePale', 'vertPale']

/**
 * genre : containerDirective (:::nom … :::), leafDirective (::nom[texte]{…})
 * ou textDirective (:nom[texte]) ; attributs permis, obligatoires, valeurs.
 */
export const VOCABULAIRE = {
  accordeon: { genre: 'containerDirective', syntaxe: ':::accordeon (un titre ### par volet)', attributs: {} },
  alerte: { genre: 'containerDirective', syntaxe: ':::alerte{type=info}', attributs: { type: { valeurs: ALERTES }, titre: {} } },
  cartes: { genre: 'containerDirective', syntaxe: ':::cartes (liste de - :icone[nom] [Titre](/lien/))', attributs: { couleur: { valeurs: ['bleuPrincipal', 'vertFonce', 'rose300', 'jaune'] } } },
  chiffres: { genre: 'containerDirective', syntaxe: ':::chiffres (un titre #### par groupe, suivi d’une liste de 2 ou 3 éléments - 1 234 libellé) ou :::chiffres{forme=tuiles} (une liste seule)', attributs: { forme: { valeurs: ['barres', 'tuiles'] } } },
  citation: { genre: 'containerDirective', syntaxe: ':::citation{source="Nom, fonction"}', attributs: { source: {} } },
  encadres: { genre: 'containerDirective', syntaxe: ':::encadres{fond=rose300} (un titre #### par encadré, suivi au besoin de :icone[nom])', attributs: { fond: { valeurs: FONDS_ENCADRES } } },
  galerie: { genre: 'containerDirective', syntaxe: ':::galerie (liste de - ![](./images/photo.jpg) Légende)', attributs: {} },
  'icone-texte': { genre: 'containerDirective', syntaxe: ':::icone-texte{icone=target fond=vertPale}', attributs: { icone: { obligatoire: true }, fond: { valeurs: FONDS_ICONE_TEXTE } } },
  'image-texte': { genre: 'containerDirective', syntaxe: ':::image-texte{position=droite taille=petite}', attributs: { position: { valeurs: ['gauche', 'droite'] }, taille: { valeurs: ['normale', 'petite'] } } },
  logos: { genre: 'containerDirective', syntaxe: ':::logos (liste de - ![Description](./images/logo.png) ou - [![Description](./images/logo.png)](https://lien/))', attributs: {} },
  liens: { genre: 'containerDirective', syntaxe: ':::liens (liste de - [Titre](/lien/) et une description)', attributs: {} },
  modalites: { genre: 'containerDirective', syntaxe: ':::modalites', attributs: {} },
  section: { genre: 'containerDirective', syntaxe: ':::section{fond=bleu100}', attributs: { fond: { obligatoire: true }, id: {} } },
  tableau: { genre: 'containerDirective', syntaxe: ':::tableau{titre="Nom du tableau"}', attributs: { titre: { obligatoire: true } } },
  bouton: { genre: 'leafDirective', syntaxe: '::bouton[Texte du bouton]{lien=/adresse/}', attributs: { lien: { obligatoire: true }, type: { valeurs: ['principal', 'secondaire'] }, alignement: { valeurs: ['gauche', 'centre'] } } },
  icone: { genre: 'textDirective', syntaxe: ':icone[nom]{taille=40 couleur=neutre700}', attributs: { taille: {}, couleur: { valeurs: Object.keys(COULEURS_ICONE) } } },
  'nombre-liens': { genre: 'textDirective', syntaxe: ':nombre-liens (nombre de liens du bloc :::liens qui suit)', attributs: {} },
}

const DIRECTIVES = new Set(['containerDirective', 'leafDirective', 'textDirective'])

const texteDe = (noeud) => noeud.value ?? (noeud.children ?? []).map(texteDe).join('')

// Marque un nœud mdast pour qu'il devienne <bib-directive> (rendu par un composant)
function marquer(noeud, nom, attributs = {}) {
  noeud.data = { ...noeud.data, hName: 'bib-directive', hProperties: { dataBib: JSON.stringify({ nom, attributs }) } }
}

// Le nœud disparaît au rendu, ses enfants restent
function deballer(noeud) {
  noeud.data = { ...noeud.data, hName: 'bib-transparent' }
}

function verifier(noeud, fichier) {
  const regle = VOCABULAIRE[noeud.name]
  const liste = Object.values(VOCABULAIRE)
    .filter((r) => r.genre !== 'textDirective')
    .map((r) => r.syntaxe)
    .join(', ')
  if (!regle) fichier.fail(`Directive inconnue : « ${noeud.name} ». Directives possibles : ${liste}.`, noeud)
  if (regle.genre !== noeud.type) fichier.fail(`La directive « ${noeud.name} » s'écrit ainsi : ${regle.syntaxe}`, noeud)
  const attributs = noeud.attributes ?? {}
  for (const [cle, valeur] of Object.entries(attributs)) {
    const permis = Object.keys(regle.attributs)
    if (!(cle in regle.attributs)) {
      fichier.fail(`Attribut « ${cle} » inconnu pour « ${noeud.name} ». ${permis.length ? `Attributs possibles : ${permis.join(', ')}.` : 'Cette directive ne prend pas d’attribut.'}`, noeud)
    }
    const { valeurs } = regle.attributs[cle]
    if (valeurs && !valeurs.includes(valeur)) fichier.fail(`« ${noeud.name} » : ${cle}=${valeur} n'existe pas. Valeurs possibles : ${valeurs.join(', ')}.`, noeud)
  }
  for (const [cle, { obligatoire }] of Object.entries(regle.attributs)) {
    if (obligatoire && !attributs[cle]?.trim()) fichier.fail(`« ${noeud.name} » : l'attribut ${cle} est obligatoire (${regle.syntaxe}).`, noeud)
  }
  return attributs
}

/**
 * Image locale d'une page (`./images/photo.jpg`) → chemin depuis la racine
 * du projet (`/src/content/pages/…/images/photo.jpg`), la clé de
 * l'import.meta.glob de RenduDirectives. Vérifie que le fichier existe.
 */
function cheminImage(url, fichier, noeud) {
  const brut = decodeURI(String(url ?? '').trim())
  if (!brut || URL.canParse(brut) || brut.startsWith('/')) {
    fichier.fail(`Image « ${brut} » : écrivez un chemin relatif vers un fichier du contenu, par exemple ./images/photo.jpg.`, noeud)
  }
  const absolu = resolve(dirname(fichier.path), brut)
  const chemin = `/${relative(process.cwd(), absolu).split(sep).join('/')}`
  if (!chemin.startsWith('/src/content/')) fichier.fail(`Image « ${brut} » : elle doit être rangée dans src/content/ (voir docs/REDACTION.md, section Images).`, noeud)
  if (!existsSync(absolu)) fichier.fail(`Image introuvable : « ${brut} ». Vérifiez le nom du fichier et le dossier.`, noeud)
  return chemin
}

const estBlanc = (noeud) => noeud.type === 'text' && !noeud.value.trim()

// Attributs de :icone[nom]{taille couleur}, vérifiés
function attributsIcone(directive, fichier) {
  const attributs = verifier(directive, fichier)
  const nom = texteDe(directive).trim()
  if (!trouverIcone(nom)) fichier.fail(messageIconeInconnue(nom), directive)
  let taille
  if (attributs.taille !== undefined) {
    taille = Number(attributs.taille)
    if (!Number.isInteger(taille) || taille < TAILLE_ICONE.min || taille > TAILLE_ICONE.max) {
      fichier.fail(`:icone[${nom}] : taille=${attributs.taille} n'est pas permise. Écrivez un nombre entier de pixels, de ${TAILLE_ICONE.min} à ${TAILLE_ICONE.max}.`, directive)
    }
  }
  return { icone: nom, taille, couleur: attributs.couleur ? COULEURS_ICONE[attributs.couleur] : undefined }
}

// Le bloc contient seulement une liste à puces ; on la rend transparente
function listeSeule(noeud, fichier, message) {
  const [liste, ...reste] = noeud.children
  if (!liste || liste.type !== 'list' || reste.length) fichier.fail(message, noeud)
  deballer(liste)
  return liste.children
}

// Contenu du seul paragraphe d'un élément de liste, sans les blancs
function paragrapheSeul(element, fichier, message) {
  const [paragraphe, ...reste] = element.children
  if (paragraphe?.type !== 'paragraph' || reste.length) fichier.fail(message, element)
  return paragraphe.children.filter((enfant) => !estBlanc(enfant))
}

// :::modalites : une seule liste à puces, chaque élément commence par :icone[nom]
function modalites(noeud, fichier) {
  const elements = listeSeule(noeud, fichier, 'Le bloc :::modalites contient seulement une liste à puces, dont chaque élément commence par :icone[nom].')
  marquer(noeud, 'modalites')
  for (const element of elements) {
    const paragraphe = element.children[0]
    const premier = paragraphe?.type === 'paragraph' ? paragraphe.children[0] : undefined
    if (premier?.type !== 'textDirective' || premier.name !== 'icone') {
      fichier.fail('Dans :::modalites, chaque élément de la liste commence par une icône : - :icone[books] Texte', element)
    }
    const icone = attributsIcone(premier, fichier)
    paragraphe.children.shift()
    const suivant = paragraphe.children[0]
    if (suivant?.type === 'text') suivant.value = suivant.value.replace(/^\s+/, '')
    marquer(element, 'modalite', icone)
  }
}

/*
 * :::cartes : une liste ; chaque élément est une carte-lien
 *   - :icone[nom] [Titre](/lien/) Texte d'appel facultatif
 *   - ![](./images/photo.jpg) [Titre](/lien/) Texte d'appel facultatif
 * Toutes les cartes d'un bloc ont la même forme : à icône (CarteTexte, ou
 * CarteIcone s'il y a un appel ou une couleur) ou à image (CarteImage).
 */
function cartes(noeud, attributs, fichier) {
  const exemple = 'Exemple : - :icone[books] [Titre de la carte](/adresse/)'
  const elements = listeSeule(noeud, fichier, `Le bloc :::cartes contient seulement une liste à puces, une carte par élément. ${exemple}`)
  const formes = new Set()
  let appel = false
  for (const element of elements) {
    const [visuel, lien, ...suite] = paragrapheSeul(element, fichier, `Une carte tient sur une seule ligne. ${exemple}`)
    const carte = {}
    if (visuel?.type === 'textDirective' && visuel.name === 'icone') {
      carte.icone = attributsIcone(visuel, fichier).icone
      formes.add('icone')
    } else if (visuel?.type === 'image') {
      carte.image = cheminImage(visuel.url, fichier, visuel)
      formes.add('image')
    } else {
      fichier.fail(`Une carte commence par une icône (:icone[nom]) ou une image (![](./images/photo.jpg)). ${exemple}`, element)
    }
    if (lien?.type !== 'link' || !texteDe(lien).trim()) fichier.fail(`Après l'icône ou l'image, la carte a un lien : [Titre](/adresse/). ${exemple}`, element)
    if (suite.some((enfant) => enfant.type !== 'text')) fichier.fail('Le texte d’appel d’une carte (après le lien) est du texte simple, sans lien ni mise en forme.', element)
    carte.titre = texteDe(lien).trim()
    carte.lien = lien.url
    const texteAppel = suite.map(texteDe).join('').trim()
    if (texteAppel) {
      carte.appel = texteAppel
      appel = true
    }
    element.children = []
    marquer(element, 'carte', carte)
  }
  if (formes.size > 1) fichier.fail('Dans un même bloc :::cartes, toutes les cartes ont une icône, ou toutes ont une image.', noeud)
  const image = formes.has('image')
  if (image && attributs.couleur) fichier.fail('« cartes » : la couleur ne s’applique qu’aux cartes à icône.', noeud)
  const forme = image ? 'image' : appel || attributs.couleur ? 'icone-appel' : 'icone'
  marquer(noeud, 'cartes', { forme, couleur: attributs.couleur })
}

/*
 * :::liens : une liste ; chaque élément commence par un lien (le titre),
 * suivi d'une description facultative, en texte simple, à la ligne suivante.
 */
function liens(noeud, fichier) {
  const exemple = 'Exemple :\n- [Titre du lien](https://exemple.ca/)\n  Description du lien.'
  const elements = listeSeule(noeud, fichier, `Le bloc :::liens contient seulement une liste à puces, un lien par élément. ${exemple}`)
  for (const element of elements) {
    const [lien, ...suite] = paragrapheSeul(element, fichier, `Un élément de :::liens est un lien suivi de sa description, sans ligne vide entre les deux. ${exemple}`)
    if (lien?.type !== 'link' || !texteDe(lien).trim()) fichier.fail(`Un élément de :::liens commence par un lien. ${exemple}`, element)
    if (suite.some((enfant) => enfant.type !== 'text')) fichier.fail('La description d’un lien de :::liens est du texte simple, sans lien ni mise en forme : toute la ligne est déjà cliquable.', element)
    const description = suite.map(texteDe).join('').replace(/\s+/g, ' ').trim()
    element.children = []
    marquer(element, 'lien', { titre: texteDe(lien).trim(), lien: lien.url, description: description || undefined })
  }
  marquer(noeud, 'liens')
}

// :::image-texte : une image seule dans le premier paragraphe, puis le texte
function imageTexte(noeud, attributs, fichier) {
  const exemple = 'Exemple :\n:::image-texte\n![](./images/photo.jpg)\n\nTexte…\n:::'
  const [premier, ...reste] = noeud.children
  const morceaux = premier?.type === 'paragraph' ? premier.children.filter((enfant) => !estBlanc(enfant)) : []
  if (morceaux.length !== 1 || morceaux[0].type !== 'image') fichier.fail(`Le bloc :::image-texte commence par une image seule sur sa ligne, suivie d'une ligne vide et du texte. ${exemple}`, noeud)
  const image = morceaux[0]
  const petite = attributs.taille === 'petite'
  // En grand format, l'image accompagne le texte (BandeImageTexte la rend
  // décorative) ; en petit format, c'est une vraie image (portrait, logo,
  // photo d'un lieu) qui peut porter une description.
  if (!petite && image.alt?.trim()) fichier.fail('Dans :::image-texte, l’image est décorative : laissez les crochets vides, ![](…), et dites l’essentiel dans le texte. Seule une petite image (taille=petite) peut avoir une description.', image)
  if (!reste.length) fichier.fail(`Le bloc :::image-texte n'a pas de texte après l'image. ${exemple}`, noeud)
  noeud.children = reste
  marquer(noeud, 'image-texte', { image: cheminImage(image.url, fichier, image), alt: petite ? (image.alt ?? '').trim() : '', position: attributs.position ?? 'droite', taille: attributs.taille ?? 'normale' })
}

/*
 * :::galerie : une liste ; chaque élément est une image suivie de sa légende
 *   - ![](./images/photo.jpg) Légende de la photo
 * Rendu en figures côte à côte (fonds-livres-rares).
 */
function galerie(noeud, fichier) {
  const exemple = 'Exemple :\n:::galerie\n- ![](./images/photo.jpg) Légende de la photo\n:::'
  const elements = listeSeule(noeud, fichier, `Le bloc :::galerie contient seulement une liste à puces, une image par élément. ${exemple}`)
  for (const element of elements) {
    const [image, ...legende] = paragrapheSeul(element, fichier, `Une image de :::galerie et sa légende tiennent sur une seule ligne. ${exemple}`)
    if (image?.type !== 'image') fichier.fail(`Chaque élément de :::galerie commence par une image. ${exemple}`, element)
    if (!legende.map(texteDe).join('').trim()) fichier.fail(`Chaque image de :::galerie a une légende, écrite après l'image. ${exemple}`, element)
    if (legende[0]?.type === 'text') legende[0].value = legende[0].value.replace(/^\s+/, '')
    const paragraphe = element.children[0]
    paragraphe.children = legende
    deballer(paragraphe)
    marquer(element, 'figure', { src: cheminImage(image.url, fichier, image), alt: (image.alt ?? '').trim() })
  }
  marquer(noeud, 'galerie')
}

/*
 * :::logos : une liste ; chaque élément est une image, liée ou non
 *   - ![Description](./images/logo.png)
 *   - [![Description](./images/logo.png)](https://lien/)
 * Un logo porte une information (ou nomme son lien) : description obligatoire.
 */
function logos(noeud, fichier) {
  const exemple = 'Exemple :\n:::logos\n- ![Palmarès 2025 des meilleurs employeurs](./images/palmares.png)\n- [![Nom du partenaire](./images/partenaire.png)](https://exemple.ca/)\n:::'
  const elements = listeSeule(noeud, fichier, `Le bloc :::logos contient seulement une liste à puces, un logo par élément. ${exemple}`)
  for (const element of elements) {
    const morceaux = paragrapheSeul(element, fichier, `Un logo tient sur une seule ligne. ${exemple}`)
    const [seul] = morceaux
    const lien = seul?.type === 'link' ? seul : undefined
    const image = lien ? lien.children.filter((enfant) => !estBlanc(enfant)) : morceaux
    if (morceaux.length !== 1 || image.length !== 1 || image[0].type !== 'image') fichier.fail(`Chaque élément de :::logos est une image seule, ou une image dans un lien. ${exemple}`, element)
    if (!image[0].alt?.trim()) fichier.fail('Dans :::logos, décrivez chaque logo entre les crochets : ![Nom ou message du logo](…). Pour un logo lié, la description nomme le lien.', element)
    element.children = []
    marquer(element, 'logo', { src: cheminImage(image[0].url, fichier, image[0]), alt: image[0].alt.trim(), lien: lien?.url })
  }
  marquer(noeud, 'logos')
}

// :::icone-texte{icone fond} : du texte, et une grande icône dans un carré de couleur à droite
function iconeTexte(noeud, attributs, fichier) {
  const nom = attributs.icone.trim()
  if (!trouverIcone(nom)) fichier.fail(messageIconeInconnue(nom), noeud)
  if (!noeud.children.length) fichier.fail('Le bloc :::icone-texte contient du texte (un titre, des paragraphes, une liste).', noeud)
  marquer(noeud, 'icone-texte', { icone: nom, fond: attributs.fond ?? 'bleu100' })
}

/*
 * Découpe un bloc en volets : le premier élément est un titre, et chaque titre
 * de ce niveau ouvre un volet qui contient tout ce qui le suit jusqu'au titre
 * suivant de même niveau (:::accordeon, :::encadres).
 */
function decouperParTitres(noeud, fichier, nomBloc) {
  const [premier] = noeud.children
  if (premier?.type !== 'heading') fichier.fail(`Le bloc :::${nomBloc} commence par un titre (${'#'.repeat(3)} Titre) ; chaque titre de ce niveau ouvre un nouveau volet.`, noeud)
  const volets = []
  for (const enfant of noeud.children) {
    if (enfant.type === 'heading' && enfant.depth === premier.depth) {
      volets.push({ type: 'voletBib', children: [enfant], position: enfant.position })
    } else {
      if (enfant.type === 'heading' && enfant.depth < premier.depth) {
        fichier.fail(`Dans :::${nomBloc}, les volets commencent par des titres ${'#'.repeat(premier.depth)} : un titre ${'#'.repeat(enfant.depth)}, plus grand, ne peut pas être dans le bloc.`, enfant)
      }
      volets.at(-1).children.push(enfant)
    }
  }
  noeud.children = volets
  return volets
}

/*
 * :::encadres{fond} : des encadrés de couleur, deux par rangée sur grand
 * écran. Chaque titre ouvre un encadré ; une icône :icone[nom] écrite à la
 * fin du titre s'affiche à sa droite (valeurs de mission-vision-valeur).
 */
function encadres(noeud, attributs, fichier) {
  for (const volet of decouperParTitres(noeud, fichier, 'encadres')) {
    const titre = volet.children[0]
    const dernier = titre.children.at(-1)
    let icone = {}
    if (dernier?.type === 'textDirective' && dernier.name === 'icone') {
      icone = attributsIcone(dernier, fichier)
      titre.children.pop()
      const avant = titre.children.at(-1)
      if (avant?.type === 'text') avant.value = avant.value.replace(/\s+$/, '')
    }
    if (volet.children.length < 2) fichier.fail('Cet encadré n’a pas de texte sous son titre.', titre)
    marquer(volet, 'encadre', icone)
  }
  marquer(noeud, 'encadres', { fond: attributs.fond ?? 'rose300' })
}

/*
 * :::chiffres : chiffres clés, chaque élément de liste commence par un nombre
 * (« 1 475 637 livres imprimés »).
 * - forme=barres (par défaut) : un titre par groupe, puis 2 ou 3 éléments,
 *   rendus en barre de répartition (Chiffres.astro) ;
 * - forme=tuiles : une liste seule, une tuile par chiffre.
 * Le contenu devient des attributs : le composant dessine tout lui-même.
 */
const NOMBRE = /^(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)\s+(\S[\s\S]*)$/
const PARTS_MAX = 3

function elementsChiffres(elements, fichier, exemple) {
  return elements.map((element) => {
    const contenu = paragrapheSeul(element, fichier, `Un élément de :::chiffres est un nombre suivi de son libellé, sur une ligne. ${exemple}`)
    if (contenu.some((enfant) => enfant.type !== 'text')) fichier.fail('Un élément de :::chiffres est du texte simple, sans lien ni mise en forme.', element)
    const trouve = texteDe({ children: contenu }).replace(/\s+/g, ' ').trim().match(NOMBRE)
    if (!trouve) fichier.fail(`Un élément de :::chiffres commence par un nombre (chiffres groupés par trois, séparés par une espace). ${exemple}`, element)
    return { valeur: Number(trouve[1].replace(/\D/g, '')), libelle: trouve[2] }
  })
}

function chiffres(noeud, attributs, fichier) {
  const forme = attributs.forme ?? 'barres'
  let groupes
  if (forme === 'tuiles') {
    const exemple = 'Exemple :\n:::chiffres{forme=tuiles}\n- 299 bases de données\n- 10 revues hébergées\n:::'
    groupes = [{ elements: elementsChiffres(listeSeule(noeud, fichier, `Le bloc :::chiffres{forme=tuiles} contient seulement une liste à puces. ${exemple}`), fichier, exemple) }]
  } else {
    const exemple = 'Exemple :\n:::chiffres\n#### Livres\n- 1 475 637 imprimés\n- 1 477 335 électroniques\n:::'
    groupes = decouperParTitres(noeud, fichier, 'chiffres').map((volet) => {
      const [titre, liste, ...reste] = volet.children
      if (liste?.type !== 'list' || reste.length) fichier.fail(`Dans :::chiffres, chaque titre est suivi d’une seule liste à puces. ${exemple}`, titre)
      if (liste.children.length < 2 || liste.children.length > PARTS_MAX) fichier.fail(`Un groupe de :::chiffres a 2 ou ${PARTS_MAX} éléments : ce sont les parts d’une même barre.`, liste)
      return { titre: texteDe(titre).trim(), elements: elementsChiffres(liste.children, fichier, exemple) }
    })
  }
  noeud.children = []
  marquer(noeud, 'chiffres', { forme, groupes })
}

// Ancre fixe d'un titre : « ### Titre {#ancre} », pour garder une ancre
// publique que le texte du titre ne donne plus
function ancreTitre(noeud, fichier) {
  const dernier = noeud.children?.at(-1)
  if (dernier?.type !== 'text') return
  const trouve = dernier.value.match(/\s*\{#([^}]*)\}\s*$/)
  if (!trouve) return
  if (!/^[a-z0-9][a-z0-9-]*$/.test(trouve[1])) fichier.fail(`Ancre « ${trouve[1]} » : écrivez-la en minuscules, sans accents ni espaces, avec des tirets (### Titre {#mon-ancre}).`, noeud)
  dernier.value = dernier.value.slice(0, trouve.index)
  noeud.data = { ...noeud.data, hProperties: { ...noeud.data?.hProperties, id: trouve[1] } }
}

/*
 * :::accordeon : le premier élément est un titre (### Question) ; chaque titre
 * de ce niveau ouvre un volet, qui contient tout ce qui le suit jusqu'au
 * titre suivant de même niveau. Le titre reste un vrai titre Markdown jusqu'au
 * rehype : il reçoit son ancre et son niveau final avec les autres.
 */
function accordeon(noeud, fichier) {
  for (const volet of decouperParTitres(noeud, fichier, 'accordeon')) {
    if (volet.children.length < 2) fichier.fail('Ce volet d’accordéon n’a pas de contenu sous son titre.', volet.children[0])
    marquer(volet, 'volet')
  }
  marquer(noeud, 'accordeon')
}

// :::tableau{titre} : un tableau Markdown, dont le titre devient le nom accessible
function tableau(noeud, attributs, fichier) {
  const tableaux = noeud.children.filter((enfant) => enfant.type === 'table')
  if (tableaux.length !== 1 || noeud.children.length !== 1) fichier.fail('Le bloc :::tableau contient seulement un tableau Markdown (lignes | … |).', noeud)
  deballer(noeud)
  tableaux[0].data = { ...tableaux[0].data, hProperties: { ...tableaux[0].data?.hProperties, dataTitre: attributs.titre } }
}

// Une directive de texte inconnue (« voir:ici ») est presque toujours un
// deux-points ordinaire : on rend le texte tel qu'il était écrit.
function texteOrdinaire(noeud) {
  const libelle = noeud.children?.length ? [{ type: 'text', value: '[' }, ...noeud.children, { type: 'text', value: ']' }] : []
  return [{ type: 'text', value: `:${noeud.name}` }, ...libelle]
}

/**
 * :nombre-liens : remplacé au build par le nombre d'éléments du premier bloc
 * :::liens qui le suit dans la page (« un répertoire de :nombre-liens
 * bibliographies »). Ajouter un lien au bloc met le nombre à jour.
 */
function nombresDeLiens(arbre, fichier) {
  const ordre = []
  const relever = (parent) => {
    for (const noeud of parent.children ?? []) {
      if (noeud.type === 'textDirective' && noeud.name === 'nombre-liens') ordre.push({ noeud, parent })
      else if (noeud.type === 'containerDirective' && noeud.name === 'liens') ordre.push({ noeud })
      relever(noeud)
    }
  }
  relever(arbre)
  ordre.forEach(({ noeud, parent }, i) => {
    if (!parent) return
    verifier(noeud, fichier)
    if (noeud.children?.length) fichier.fail('Le nombre de liens s’écrit seul, sans crochets : :nombre-liens', noeud)
    const bloc = ordre.slice(i + 1).find((entree) => !entree.parent)?.noeud
    const liste = bloc?.children.find((enfant) => enfant.type === 'list')
    if (!liste) fichier.fail('« :nombre-liens » compte les liens du bloc :::liens qui le suit ; aucun bloc :::liens ne vient après dans la page.', noeud)
    parent.children.splice(parent.children.indexOf(noeud), 1, { type: 'text', value: liste.children.length.toLocaleString('fr-CA') })
  })
}

export function remarkDirectivesBib() {
  return (arbre, fichier) => {
    nombresDeLiens(arbre, fichier)
    const parcourir = (parent) => {
      const enfants = parent.children ?? []
      for (let i = 0; i < enfants.length; i++) {
        const noeud = enfants[i]
        if (DIRECTIVES.has(noeud.type)) {
          if (noeud.type === 'textDirective' && !VOCABULAIRE[noeud.name]) {
            const remplacement = texteOrdinaire(noeud)
            enfants.splice(i, 1, ...remplacement)
            i += remplacement.length - 1
            continue
          }
          if (noeud.name === 'icone') fichier.fail('Une icône :icone[nom] ne s’écrit qu’au début d’un élément de :::modalites ou de :::cartes, ou à la fin d’un titre de :::encadres.', noeud)
          const attributs = verifier(noeud, fichier)
          if (noeud.name === 'modalites') modalites(noeud, fichier)
          else if (noeud.name === 'cartes') cartes(noeud, attributs, fichier)
          else if (noeud.name === 'liens') liens(noeud, fichier)
          else if (noeud.name === 'image-texte') imageTexte(noeud, attributs, fichier)
          else if (noeud.name === 'galerie') galerie(noeud, fichier)
          else if (noeud.name === 'logos') logos(noeud, fichier)
          else if (noeud.name === 'icone-texte') iconeTexte(noeud, attributs, fichier)
          else if (noeud.name === 'encadres') encadres(noeud, attributs, fichier)
          else if (noeud.name === 'accordeon') accordeon(noeud, fichier)
          else if (noeud.name === 'tableau') tableau(noeud, attributs, fichier)
          else if (noeud.name === 'chiffres') chiffres(noeud, attributs, fichier)
          else if (noeud.name === 'citation') marquer(noeud, 'citation', { source: attributs.source })
          else if (noeud.name === 'alerte') marquer(noeud, 'alerte', { type: attributs.type ?? 'info', titre: attributs.titre })
          else if (noeud.name === 'section') marquer(noeud, 'section', { fond: attributs.fond, id: attributs.id })
          else if (noeud.name === 'bouton') {
            if (!texteDe(noeud).trim()) fichier.fail('Le bouton n’a pas de texte : ::bouton[Texte du bouton]{lien=/adresse/}', noeud)
            marquer(noeud, 'bouton', { lien: attributs.lien, type: attributs.type ?? 'principal', alignement: attributs.alignement ?? 'gauche' })
          }
        } else if (noeud.type === 'heading') {
          ancreTitre(noeud, fichier)
        }
        parcourir(noeud)
      }
    }
    parcourir(arbre)
  }
}

// Éléments de tableau → Tableau et ses parties (RenduDirectives)
const TABLEAU = { thead: 'tete', tbody: 'corps', tr: 'rangee', th: 'cellule', td: 'cellule' }
const TITRE = /^h([1-6])$/

// Texte d'un titre hast, sans son lien d'ancre (rehype-ancres-titres)
const texteTitre = (noeud) =>
  noeud.type === 'text' ? noeud.value : noeud.properties?.className?.includes?.('ancre-titre') ? '' : (noeud.children ?? []).map(texteTitre).join('')

const imageLocale = (src) => typeof src === 'string' && !URL.canParse(src) && !src.startsWith('/')

/*
 * Parcourt l'arbre hast dans l'ordre du document. `etat.niveau` est le niveau
 * final (après rehype-titre-principal) du dernier titre rencontré : les
 * titres que posent les composants (liens, cartes à image) se placent juste
 * en dessous, pour une hiérarchie sans saut.
 */
function transformer(enfants, etat, fichier) {
  const resultat = []
  for (const noeud of enfants) {
    if (noeud.type !== 'element') {
      resultat.push(noeud)
      continue
    }
    const { tagName, properties = {} } = noeud
    if (TITRE.test(tagName)) etat.niveau = Number(tagName[1])

    // Filet `---` → Separateur, comme <Separateur /> dans le MDX
    if (tagName === 'hr') {
      resultat.push(marqueurOuvrant('separateur'), marqueurFermant())
      continue
    }

    if (tagName === 'img' && imageLocale(properties.src)) {
      const src = cheminImage(properties.src, fichier, noeud)
      resultat.push(marqueurOuvrant('image', { src, alt: properties.alt ?? '' }), marqueurFermant())
      continue
    }

    // Lien du texte → composant Lien, comme dans le MDX : annonce « (PDF) »
    // et « (nouvel onglet) ». Le lien d'ancre des titres reste tel quel.
    if (tagName === 'a' && !properties.className?.includes?.('ancre-titre')) {
      const sousLien = transformer(noeud.children ?? [], etat, fichier)
      const attributs = { href: properties.href, title: properties.title, target: properties.target, rel: Array.isArray(properties.rel) ? properties.rel.join(' ') : properties.rel }
      resultat.push(marqueurOuvrant('a', attributs), ...sousLien, marqueurFermant())
      continue
    }

    let directive
    if (tagName === 'bib-directive') {
      directive = JSON.parse(properties.dataBib)
      if (directive.nom === 'liens' || directive.nom === 'cartes') directive.attributs.niveau = Math.min(6, etat.niveau + 1)
    }
    let sous = transformer(noeud.children ?? [], etat, fichier)

    if (directive?.nom === 'volet') {
      // Le titre du volet devient le <summary> de l'accordéon ; son id passe
      // au volet, que le script d'Accordeon ouvre quand l'ancre le vise
      const titre = sous.find((enfant) => enfant.type === 'element' && TITRE.test(enfant.tagName))
      directive.attributs = { titre: texteTitre(titre).trim(), niveau: Number(titre.tagName[1]), id: titre.properties?.id }
      sous = sous.filter((enfant) => enfant !== titre)
    }

    if (tagName === 'bib-transparent') {
      resultat.push(...sous)
    } else if (directive) {
      resultat.push(marqueurOuvrant(directive.nom, directive.attributs), ...sous, marqueurFermant())
    } else if (tagName === 'table') {
      resultat.push(marqueurOuvrant('tableau', { titre: properties.dataTitre }), ...sous, marqueurFermant())
    } else if (TABLEAU[tagName]) {
      const attributs = TABLEAU[tagName] === 'cellule' && properties.align ? { align: properties.align } : {}
      resultat.push(marqueurOuvrant(TABLEAU[tagName], attributs), ...sous, marqueurFermant())
    } else {
      noeud.children = sous
      resultat.push(noeud)
    }
  }
  return resultat
}

export function rehypeDirectivesBib() {
  return (arbre, fichier) => {
    // Sans titre avant le premier composant titré, celui-ci vient sous le h1
    arbre.children = transformer(arbre.children, { niveau: 1 }, fichier)
    // Les images locales sont rendues par RenduDirectives (<Picture>) : Astro
    // n'a plus à les importer ni à les optimiser en une seule taille
    if (fichier.data.astro) fichier.data.astro.localImagePaths = []
  }
}
