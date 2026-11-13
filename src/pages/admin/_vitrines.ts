import { NOMS_FONDS } from '@/lib/fonds'
import { lieuxAvecFiche } from '@/data/horaires/lieux'

/*
 * Champs Decap CMS des vitrines (.yaml), lus par config.yml.ts.
 *
 * Reprend lib/schema-vitrines.ts, qui reste le juge : Decap ne vérifie
 * que la forme (champs requis, motifs, nombre d'éléments) ; le build refuse
 * une icône inconnue ou une combinaison interdite. Une valeur par défaut du
 * schéma n'est pas écrite par Decap : l'aide du champ la donne.
 *
 * `sections` est une liste à types (typeKey « type ») : chaque élément choisit
 * son bloc, avec ses propres champs.
 */

type Champ = Record<string, unknown>

const LIBELLES_FONDS: Record<(typeof NOMS_FONDS)[number], string> = {
  bleuPrincipal: 'Bleu principal',
  bleuFonce: 'Bleu foncé',
  bleu600: 'Bleu 600',
  vertFonce: 'Vert foncé',
  rougeOrange: 'Rouge orangé',
  violetFonce: 'Violet foncé',
  vertPale: 'Vert pâle',
  jaune: 'Jaune',
  rose500: 'Rose 500',
  bleu100: 'Bleu 100 (clair)',
  bleu200: 'Bleu 200 (clair)',
  jaunePale: 'Jaune pâle',
  rose100: 'Rose 100 (clair)',
  rose300: 'Rose 300 (clair)',
}

const MOTIF_LIEN = ['^(/|#|https?://|mailto:|tel:)', 'Un lien commence par / (page du site), # (ancre), https://, mailto: ou tel:']
const MOTIF_ANCRE = ['^[a-z0-9]+(-[a-z0-9]+)*$', 'En minuscules, sans accents ni espaces (ex. droit-auteur)']
const MOTIF_CADRAGE = ['^(100|[1-9]?\\d)%$', 'Un pourcentage, par exemple 20%']

// ---- Champs de base ----

// Un groupe facultatif (bouton, lienTout…) a des sous-champs facultatifs
// aussi : Decap les exige même quand le groupe est absent du fichier, et
// refuse alors tout enregistrement. Le schéma du build exige le reste.
const facultatif = (champ: Champ): Champ => ({
  ...champ,
  required: false,
  ...(champ.widget === 'object' && { fields: (champ.fields as Champ[]).map(facultatif) }),
})

const texte = (label: string, name: string, hint?: string): Champ => ({ label, name, widget: 'string', ...(hint && { hint }) })

const markdown = (label: string, name: string, hint?: string): Champ => ({
  label,
  name,
  widget: 'markdown',
  modes: ['raw'],
  hint: hint ?? 'Markdown : paragraphes, **gras**, [liens](/adresse/), listes.',
})

const lien = (label = 'Lien', name = 'lien'): Champ => ({ label, name, widget: 'string', pattern: MOTIF_LIEN })

const image = (label = 'Image', name = 'image'): Champ => ({ label, name, widget: 'image', choose_url: false })

const icone = (label = 'Icône', name = 'icone'): Champ => ({
  label,
  name,
  widget: 'string',
  hint: 'Nom d’une icône Phosphor (ex. book-open-text) ou d’une icône maison : voir docs/REDACTION.md. Un nom inconnu fait échouer la publication.',
})

const caseACocher = (label: string, name: string, hint?: string): Champ => facultatif({ label, name, widget: 'boolean', ...(hint && { hint }) })

const choix = (label: string, name: string, options: (string | { label: string; value: string })[], hint?: string): Champ => ({
  label,
  name,
  widget: 'select',
  options,
  ...(hint && { hint }),
})

const nombre = (label: string, name: string, min: number, max: number, hint: string): Champ =>
  facultatif({ label, name, widget: 'number', value_type: 'int', min, max, hint })

const couleur = (label = 'Fond', name = 'fond', hint?: string): Champ =>
  choix(
    label,
    name,
    NOMS_FONDS.map((nom) => ({ label: LIBELLES_FONDS[nom], value: nom })),
    hint,
  )

const objet = (label: string, name: string, fields: Champ[], extra: Champ = {}): Champ => ({ label, name, widget: 'object', collapsed: true, fields, ...extra })

const liste = (label: string, name: string, fields: Champ[], extra: Champ = {}): Champ => ({
  label,
  name,
  widget: 'list',
  collapsed: true,
  summary: '{{fields.titre}}',
  fields,
  ...extra,
})

const listeTextes = (label: string, name: string, hint?: string): Champ => ({
  label,
  name,
  widget: 'list',
  field: { label, name: 'ligne', widget: 'string' },
  ...(hint && { hint }),
})

// ---- Groupes réutilisés ----

const champsBouton = [
  texte('Texte', 'texte'),
  lien(),
  caseACocher('Bouton texte (secondaire)', 'secondaire', 'Bleu, sans fond : pour une action moins importante que sa voisine.'),
  caseACocher('Bouton à contour', 'contour', 'Pilule bordée, sans fond.'),
]
const bouton = (label = 'Bouton'): Champ => facultatif(objet(label, 'bouton', champsBouton))
const boutons = (): Champ => facultatif(liste('Boutons', 'boutons', champsBouton, { summary: '{{fields.texte}}', min: 1 }))

const lienTout = (): Champ =>
  facultatif(
    objet('Lien « tout voir »', 'lienTout', [
      texte('Texte', 'texte'),
      lien(),
      caseACocher('Nouvel onglet', 'nouvelOnglet', 'Pour une application externe qu’on garde ouverte à côté du site.'),
    ]),
  )

const titre = (requis = true): Champ => (requis ? texte('Titre', 'titre') : facultatif(texte('Titre', 'titre')))
const texteFacultatif = (): Champ => facultatif(markdown('Texte', 'texte'))

/** Champs de toute section : fond de la bande, ancre, libellé du sommaire */
const communs = (avecFond = true): Champ[] => [
  ...(avecFond ? [facultatif(couleur('Fond de la bande'))] : []),
  facultatif({ label: 'Ancre', name: 'id', widget: 'string', pattern: MOTIF_ANCRE, hint: 'Adresse directe du bloc : /page/#ancre.' }),
  facultatif(texte('Libellé du sommaire', 'libelle', 'Nom court dans « Sur cette page » ; sans libellé, le bloc n’y figure pas.')),
]

const COULEURS_CARTES = ['bleuPrincipal', 'vertFonce', 'rose300', 'jaune'].map((nom) => ({ label: LIBELLES_FONDS[nom as keyof typeof LIBELLES_FONDS], value: nom }))
const COULEURS_ACCORDEONS = ['bleuPrincipal', 'rose', 'vertPale'].map((nom) => ({ label: nom === 'rose' ? 'Rose' : LIBELLES_FONDS[nom as keyof typeof LIBELLES_FONDS], value: nom }))

const carteIcone = (lienRequis = true): Champ[] => [
  texte('Titre', 'titre'),
  icone(),
  lienRequis ? lien() : facultatif({ ...lien(), hint: 'Sans lien, la carte annonce ce qui s’en vient (« Bientôt »).' }),
  facultatif(texte('Appel', 'appel', 'Texte du lien, si ce n’est pas le titre.')),
]
const carteImage: Champ[] = [texte('Titre', 'titre'), image(), lien(), facultatif(texte('Appel', 'appel', 'Texte du lien, si ce n’est pas le titre.'))]

const volet: Champ[] = [
  texte('Titre', 'titre'),
  facultatif({ label: 'Ancre', name: 'id', widget: 'string', pattern: MOTIF_ANCRE }),
  texteFacultatif(),
  facultatif(
    objet('Coordonnées', 'coordonnees', [
      facultatif(texte('Courriel', 'courriel')),
      facultatif({ label: 'Téléphone', name: 'telephone', widget: 'string', pattern: ['^[0-9 -]+$', 'Chiffres, espaces et tirets (ex. 514 343-2135)'] }),
      facultatif(listeTextes('Adresse', 'adresse', 'Une ligne par élément.')),
      facultatif(lien('Itinéraire', 'itineraire')),
    ]),
  ),
]
const accordeonsCouleur = (name: string): Champ => facultatif(choix('Couleur des accordéons', name, COULEURS_ACCORDEONS, 'Par défaut : bleu principal.'))

// ---- Blocs ----

const bloc = (name: string, label: string, fields: Champ[]): Champ => ({ name, label, widget: 'object', summary: '{{fields.titre}}', fields })

const blocs: Champ[] = [
  bloc('texte', 'Texte et boutons', [...communs(), titre(), texteFacultatif(), boutons()]),
  bloc('image-texte', 'Image et texte', [
    ...communs(),
    titre(),
    markdown('Texte', 'texte'),
    image(),
    facultatif(texte('Légende', 'legende', 'Ce qu’on voit sur l’image (Markdown sur une ligne).')),
    facultatif(texte('Texte de remplacement', 'alt', 'Seulement si l’image porte un message (texte, logo de campagne). Sinon, laissez vide : l’image est décorative.')),
    facultatif(choix('Position de l’image', 'positionImage', ['gauche', 'droite'], 'Par défaut : droite.')),
    facultatif(choix('Disposition', 'disposition', ['colonnes', 'encart'], 'Par défaut : colonnes. Encart : carte rose pâle ramassée, texte et bouton bleu foncé.')),
    facultatif(choix('Couleur de l’encart', 'teinteEncart', ['rose', 'vertFonce', 'bleu', 'bleuFonce'], 'Encart : rose pâle par défaut ; vert foncé, bleu UdeM ou bleu foncé, texte blanc.')),
    facultatif({ label: 'Cadrage de l’image', name: 'cadrage', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Encart : hauteur de la photo gardée quand elle est recadrée (0% le haut, 50% le centre).' }),
    facultatif({ label: 'Cadrage horizontal de l’image', name: 'cadrageHorizontal', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Encart, téléphone : position gardée quand la photo est coupée sur les côtés (0% la gauche, 50% le centre).' }),
    caseACocher('Recadrer l’image', 'recadrerImage', 'Colonnes : l’image remplit sa colonne à la hauteur du texte.'),
    { ...caseACocher('Titre dans la colonne du texte', 'titreEnColonne', 'Colonnes : par défaut, oui. Décochez pour le mettre au-dessus, pleine largeur.'), default: true },
    { ...caseACocher('Image réduite', 'imageReduite', 'Colonnes : par défaut, oui (88 % de la colonne).'), default: true },
    facultatif(choix('Taille de l’image', 'tailleImage', ['normale', 'petite'], 'Colonnes : petite, l’image prend les deux tiers de sa colonne.')),
    facultatif(liste('Icônes', 'icones', [icone(), texte('Texte', 'texte')], { min: 1, summary: '{{fields.texte}}', hint: 'Colonnes : icônes légendées sous le texte.' })),
    facultatif(couleur('Couleur des icônes', 'couleurIcones')),
    bouton(),
    boutons(),
  ]),
  bloc('image-fond', 'Photo en fond de bande', [
    ...communs(false),
    titre(),
    markdown('Texte', 'texte'),
    image(),
    facultatif({ label: 'Cadrage', name: 'cadrage', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Hauteur de la photo gardée : 0% le haut, 50% le centre.' }),
    bouton(),
  ]),
  bloc('cartes-sections', 'Cartes-sections (2 à 4)', [
    ...communs(),
    liste('Cartes', 'cartes', [titre(), facultatif({ label: 'Ancre', name: 'id', widget: 'string', pattern: MOTIF_ANCRE }), markdown('Texte', 'texte'), image(), facultatif(couleur()), bouton()], {
      min: 2,
      max: 4,
    }),
  ]),
  bloc('carrousel-images', 'Carrousel de cartes à photo', [
    ...communs(),
    titre(),
    texteFacultatif(),
    caseACocher('Titres sans empattement', 'titresSansSerif'),
    liste('Cartes', 'cartes', carteImage, { min: 1 }),
  ]),
  bloc('cartes-images', 'Grille de cartes à photo', [
    ...communs(),
    { ...titre(false), hint: 'Sans titre, les titres des cartes deviennent les intertitres de la page.' },
    texteFacultatif(),
    liste('Cartes', 'cartes', carteImage, { min: 1 }),
  ]),
  bloc('cartes-revelation', 'Cartes à révélation', [
    ...communs(),
    titre(),
    texteFacultatif(),
    facultatif(choix('Couleur des cartes à icône', 'couleurCartes', COULEURS_CARTES.filter(({ value }) => value !== 'jaune'), 'Par défaut : bleu principal.')),
    facultatif(choix('Disposition', 'disposition', ['carrousel', 'compacte'], 'Par défaut : carrousel. Compacte : cartes à icône, sans bouton.')),
    liste(
      'Cartes',
      'cartes',
      [
        titre(),
        facultatif(texte('Sous-titre', 'sousTitre')),
        facultatif({ ...image(), hint: 'Une image ou une icône, pas les deux.' }),
        facultatif({ ...icone(), hint: 'Une image ou une icône, pas les deux. Nom Phosphor ou icône maison.' }),
        texteFacultatif(),
        bouton(),
      ],
      { min: 1 },
    ),
    lienTout(),
  ]),
  bloc('grille-elargissable', 'Grille de cartes à icône compactes', [
    ...communs(),
    titre(),
    texteFacultatif(),
    facultatif(choix('Couleur des cartes', 'couleurCartes', COULEURS_CARTES, 'Par défaut : bleu principal.')),
    liste('Cartes', 'cartes', carteIcone(false), { min: 1 }),
    bouton(),
  ]),
  bloc('texte-icones', 'Texte et grille d’icônes', [
    ...communs(),
    titre(),
    texteFacultatif(),
    bouton(),
    boutons(),
    couleur('Couleur des icônes', 'couleurIcones'),
    liste('Icônes', 'icones', [icone(), texte('Texte', 'texte')], { min: 1, summary: '{{fields.texte}}' }),
  ]),
  bloc('icone-texte', 'Grande icône et texte', [
    ...communs(),
    icone(),
    choix('Couleur de l’icône', 'couleurIcone', [...NOMS_FONDS.map((nom) => ({ label: LIBELLES_FONDS[nom], value: nom })), { label: 'Blanc', value: 'blanc' }]),
    titre(),
    markdown('Texte', 'texte'),
    boutons(),
    facultatif(liste('Accordéons', 'accordeons', volet, { min: 1 })),
    accordeonsCouleur('couleurAccordeons'),
  ]),
  bloc('liste-liens', 'Liste de liens décrits', [
    ...communs(),
    { ...titre(false), hint: 'Sans titre, les titres des liens deviennent les intertitres de la page.' },
    texteFacultatif(),
    facultatif(choix('Présentation', 'presentation', [{ label: 'Liste', value: 'liste' }, { label: 'Cartes à icône, deux par rangée', value: 'cartes' }], 'Par défaut : liste.')),
    liste('Liens', 'liens', [texte('Titre', 'titre'), facultatif(texte('Description', 'description')), lien(), facultatif(texte('Appel', 'appel')), facultatif({ ...icone(), hint: 'Facultative : icône à gauche du titre.' })], { min: 1 }),
  ]),
  bloc('accordeons', 'Accordéons', [...communs(), titre(), texteFacultatif(), accordeonsCouleur('couleur'), liste('Volets', 'volets', volet, { min: 1 })]),
  bloc('video', 'Vidéo YouTube', [
    ...communs(),
    titre(),
    texteFacultatif(),
    {
      label: 'Identifiant YouTube',
      name: 'youtube',
      widget: 'string',
      pattern: ['^[A-Za-z0-9_-]{11}$', '11 caractères : ce qui suit « watch?v= » dans l’adresse'],
    },
    texte('Titre de la vidéo', 'titreVideo', 'Annoncé sur le bouton de lecture.'),
    facultatif({ ...image(), hint: 'Photo derrière le bouton de lecture (une image tirée de la vidéo, par exemple). Sans photo : fond bleu foncé.' }),
    facultatif(lien('Page de la transcription', 'transcription')),
  ]),
  bloc('quoi-de-neuf', 'Quoi de neuf (accueil)', [...communs(), titre(), nombre('Nombre', 'nombre', 1, 10, 'Par défaut : 4.')]),
  bloc('formations', 'Prochaines formations', [...communs(), titre(), texteFacultatif(), nombre('Nombre', 'nombre', 2, 20, 'Par défaut : 8 (pair de préférence).'), lienTout()]),
  bloc('personnel', 'Personnel d’une bibliothèque', [
    ...communs(),
    titre(),
    texteFacultatif(),
    choix(
      'Bibliothèque',
      'bibliotheque',
      lieuxAvecFiche.map((lieu) => ({ label: lieu.fiche!.titre, value: lieu.fiche!.id })),
    ),
    facultatif(listeTextes('Ordre d’affichage', 'ordre', 'Prénom et nom, comme dans le répertoire du personnel ; les autres suivent par ordre alphabétique.')),
    lienTout(),
    facultatif(objet('Coordonnées', 'coordonnees', [titre(), markdown('Texte', 'texte'), bouton()])),
  ]),
]

/** Champs d'une vitrine ; `bannieres` : noms des bannières (super-heroes) */
export function champsVitrine(bannieres: string[]): Champ[] {
  return [
    texte('Titre', 'title', 'Titre de l’onglet et des listes.'),
    facultatif(texte('Libellé du fil d’Ariane', 'crumbLabel')),
    facultatif({ label: 'Description', name: 'description', widget: 'text', hint: 'Résumé pour les moteurs de recherche et le partage.' }),
    facultatif(
      objet('Menu de la section', 'secondaryNav', [
        facultatif(texte('Libellé dans le menu', 'title')),
        facultatif({ label: 'Ordre', name: 'order', widget: 'number', value_type: 'int' }),
        caseACocher('Masquer du menu', 'hidden'),
        facultatif(
          liste('Liens vers d’autres pages', 'links', [
            texte('Libellé', 'title'),
            { ...texte('Adresse', 'url', 'Commence par / (page du site) ou par https://.'), pattern: ['^(/|https?://)', 'Une adresse commence par / ou par https://'] },
            facultatif({ label: 'Ordre', name: 'order', widget: 'number', value_type: 'int' }),
          ], { summary: '{{fields.title}}', hint: 'Page de section seulement : ajoute au menu de gauche des pages rangées ailleurs.' }),
        ),
      ]),
    ),
    caseACocher('Exclure des moteurs de recherche', 'noindex'),
    facultatif(texte('Langue', 'lang', 'Seulement si la page n’est pas en français (ex. en).')),
    facultatif(
      objet('Bannière', 'banniere', [
        titre(),
        facultatif(choix('Image', 'image', bannieres, 'Obligatoire, sauf avec des portraits.')),
        facultatif(listeTextes('Sous-titre', 'sousTitre', 'Une ligne par élément.')),
        { ...bouton('Bouton sous le titre'), hint: 'Bannière des sections seulement.' },
        facultatif(choix('Taille', 'taille', ['normale', 'petite'], 'Par défaut : normale.')),
        caseACocher('Titre en plus petit', 'titreReduit', 'Bannière des sections : police réduite pour un titre long. Automatique au-delà de 45 caractères.'),
        facultatif({ label: 'Cadrage', name: 'cadrage', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Hauteur de la photo gardée : 0% le haut, 50% le centre.' }),
        caseACocher('Recherche Sofia', 'rechercheSofia', 'Grande bannière de l’accueil, avec la boîte de recherche.'),
        facultatif(
          liste('Portraits', 'portraits', [
            image('Photo'),
            texte('Slogan', 'titre', 'Titre affiché avec cette photo.'),
            texte('Nom', 'nom'),
            texte('Fonction', 'fonction'),
            facultatif({ label: 'Cadrage', name: 'cadrage', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Seulement si différent de celui de la bannière.' }),
            facultatif({ label: 'Cadrage horizontal', name: 'cadrageHorizontal', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Téléphone : position gardée quand la photo est coupée sur les côtés (0% la gauche, 50% le centre).' }),
            facultatif({ label: 'Remontée sur téléphone', name: 'decalageMobile', widget: 'string', pattern: MOTIF_CADRAGE, hint: 'Téléphone : remonte la photo de ce pourcentage de sa hauteur (ex. 8%), si le slogan cache le visage.' }),
          ], { summary: '{{fields.nom}} – {{fields.titre}}', hint: 'Accueil seulement (avec Recherche Sofia) : une photo tirée au hasard à chaque chargement.' }),
        ),
      ]),
    ),
    {
      label: 'Sections',
      name: 'sections',
      widget: 'list',
      collapsed: true,
      min: 1,
      typeKey: 'type',
      summary: '{{fields.titre}}',
      types: blocs,
    },
  ]
}
