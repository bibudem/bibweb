import type { APIRoute } from 'astro'
import { toutesLesPages, estVitrine } from '@/lib/contenu'
import { dossiersDePages } from './_arborescence'
import { SUJETS } from '@/data/sujets'
import { champsVitrine, MOTIF_COURRIEL, MOTIF_LANGUE } from './_vitrines'
import { personnel } from '@/lib/personnel'
import { NOMS_BANNIERES } from '@/lib/bannieres'

/*
 * Configuration de Decap CMS (/admin/config.yml), lue par public/admin/index.html.
 *
 * Générée à partir du contenu et des listes du code, pour qu'il n'y ait pas
 * de second schéma à tenir à la main : chaque page .md devient une fiche
 * (regroupées par section), les sujets et les bannières viennent de
 * src/data/sujets.ts et du dossier des bannières. Le build reste le juge :
 * Decap ne valide que la forme des champs, le schéma Zod de
 * content.config.ts refuse le reste.
 *
 * Choix :
 * - Le corps des pages et des nouvelles s'édite en Markdown brut : un éditeur
 *   visuel réécrirait les directives (:::tableau, ::bouton…) à l'enregistrement.
 * - Les vitrines (.yaml) ont leurs champs dans _vitrines.ts. Les pages .mdx ne
 *   sont pas encore modifiables.
 * - Pages : une seule collection « Pages », imbriquée (nested, subfolders:
 *   false) : le menu de gauche montre l'arborescence des dossiers (sections,
 *   puis leurs sous-dossiers), et chaque dossier liste ses pages .md. Une page
 *   se crée dans le dossier ouvert, ou celui choisi dans « Emplacement »
 *   (meta.path : sections, sous-dossiers, et toute page .md, dont le dossier
 *   du même nom reçoit alors ses sous-pages, voir _arborescence.ts) ; une nouvelle page /<section>/<titre>/ entre d'elle-même dans
 *   le menu de la section. Decap tire le nom du nouveau fichier du titre, en
 *   gardant les accents (« réserve.md ») : sans effet sur l'adresse, que
 *   id-de-page.mjs passe dans slugify. Le garde-fou de public/admin/index.html
 *   (arborescence.json.ts) refuse une création qui reprendrait l'adresse
 *   d'une page existante (Decap écraserait le fichier) et un changement
 *   d'emplacement (déplacement). Pas de suppression depuis Decap non plus :
 *   une page retirée ou déplacée peut casser des liens et la navigation (le
 *   build échoue alors) ; cela se fait dans le dépôt.
 * - Decap réécrit l'en-tête (frontmatter) à l'enregistrement : ordre des champs
 *   de ce fichier, dates sans guillemets, listes à la ligne. Le corps n'est
 *   pas touché.
 * - En ligne, chaque enregistrement est un commit sur main : la
 *   pré-production (GitHub Pages) est reconstruite, puis une pull request
 *   main → production s'ouvre ou se met à jour (deployer-pages.yml). La mise
 *   en ligne se fait en fusionnant cette PR.
 *   En développement (npm run cms:local), Decap écrit directement dans les
 *   fichiers, sans branche : on voit le résultat dans le serveur de dev.
 * - Connexion : Decap ouvre admin/connexion.html sur le site même
 *   (DECAP_ORIGINE, ex. https://bibudem.github.io), qui passe au relais OAuth
 *   GitHub (DECAP_AUTH_URL, n8n). Voir connexion.html.ts.
 *
 * JSON.stringify suffit : un document JSON est un document YAML valide.
 */

export const prerender = true

// Dépôt où Decap écrit : celui du build (GITHUB_REPOSITORY, fourni par GitHub
// Actions), sinon le dépôt des Bibliothèques
const DEPOT = process.env.GITHUB_REPOSITORY || 'bibudem/bibweb'
// Bannières de page (superHero.imageName) : noms de fichier sans extension (lib/bannieres)
const bannieres = NOMS_BANNIERES

// Fenêtre de connexion (connexion.html.ts), chemin sans barre initiale
// sous le sous-dossier de publication : « bibweb/admin/connexion.html »
const pageConnexion = [process.env.BASE_PATH, 'admin/connexion.html']
  .map((partie) => partie?.replace(/^\/+|\/+$/g, ''))
  .filter(Boolean)
  .join('/')

// Images d'une page ou d'une nouvelle : dossier images/ à côté du fichier
const imagesACote = { media_folder: 'images', public_folder: './images' }

const corps = {
  label: 'Contenu',
  name: 'body',
  widget: 'markdown',
  modes: ['raw'],
  hint: 'Markdown : ## intertitres, **gras**, [liens](/adresse/), listes. Les blocs du site (:::alerte, ::bouton, :::tableau…) s’écrivent entre deux-points ; reprendre ceux d’une page existante.',
}

const champsPage = [
  { label: 'Titre', name: 'title', widget: 'string', required: false, hint: 'Titre de l’onglet et des listes.' },
  { label: 'Libellé du fil d’Ariane', name: 'crumbLabel', widget: 'string', required: false },
  { label: 'Description', name: 'description', widget: 'text', required: false, hint: 'Résumé pour les moteurs de recherche et le partage.' },
  {
    label: 'Menu de la section',
    name: 'secondaryNav',
    widget: 'object',
    required: false,
    collapsed: true,
    fields: [
      { label: 'Libellé dans le menu', name: 'title', widget: 'string', required: false },
      { label: 'Ordre', name: 'order', widget: 'number', value_type: 'int', required: false },
      { label: 'Masquer du menu', name: 'hidden', widget: 'boolean', required: false },
      {
        label: 'Liens vers d’autres pages',
        name: 'links',
        widget: 'list',
        required: false,
        collapsed: true,
        summary: '{{fields.title}}',
        hint: 'Page de section seulement : ajoute au menu de gauche des pages rangées ailleurs.',
        fields: [
          { label: 'Libellé', name: 'title', widget: 'string' },
          { label: 'Adresse', name: 'url', widget: 'string', hint: 'Commence par / (page du site) ou par https://.', pattern: ['^(/|https?://)', 'Une adresse commence par / ou par https://'] },
          { label: 'Ordre', name: 'order', widget: 'number', value_type: 'int', required: false },
        ],
      },
    ],
  },
  {
    label: 'Bannière',
    name: 'superHero',
    widget: 'object',
    required: false,
    collapsed: true,
    fields: [
      // Défaut : sans lui, une nouvelle page ne s'enregistrait pas (le bloc
      // facultatif est quand même validé, et l'image y est obligatoire)
      { label: 'Image', name: 'imageName', widget: 'select', options: bannieres, ...(bannieres.includes('default') ? { default: 'default' } : {}) },
      { label: 'Titre de la bannière', name: 'title', widget: 'string', required: false },
      { label: 'Cadrage', name: 'cadrage', widget: 'string', required: false, pattern: ['^(100|[1-9]?\\d)%$', 'Un pourcentage, par exemple 20%'] },
    ],
  },
  { label: 'Exclure des moteurs de recherche', name: 'noindex', widget: 'boolean', required: false },
  // Faux par défaut : une page sans la clé s'affiche case décochée et garde son
  // sommaire, ce qui est bien son état (un défaut à vrai la montrait décochée)
  { label: 'Retirer le sommaire « Sur cette page »', name: 'sansSommaire', widget: 'boolean', required: false, default: false, hint: 'Cocher pour ne pas afficher le sommaire, même si la page a plusieurs sections.' },
  { label: 'Langue', name: 'lang', widget: 'string', required: false, hint: 'Seulement si la page n’est pas en français (ex. en).', pattern: MOTIF_LANGUE },
  corps,
]

const champsNouvelle = [
  { label: 'Titre', name: 'title', widget: 'string' },
  { label: 'Titre affiché', name: 'titreAffiche', widget: 'string', required: false, hint: 'Seulement s’il diffère du titre.' },
  { label: 'Date', name: 'date', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'YYYY-MM-DD', time_format: false },
  { label: 'Type', name: 'type', widget: 'hidden', default: 'interne' },
  {
    label: 'Adresse (slug)',
    name: 'slug',
    widget: 'string',
    required: false,
    hint: 'Fin de l’adresse de la nouvelle, unique dans l’année. Ne pas changer après publication.',
    pattern: ['^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$', 'Lettres sans accents, chiffres et tirets (ex. nouvel-horaire)'],
  },
  { label: 'Source', name: 'source', widget: 'string', required: false, hint: 'Ex. Bibliothèques, Quoi de neuf.' },
  { label: 'Lien de la nouvelle d’origine', name: 'newsUrl', widget: 'string', required: false, pattern: ['^https?://', 'Une adresse complète (https://…)'] },
  // `field` : sans lui, Decap découpe la liste aux virgules (« Tremblay, Ana » donnait deux auteurs)
  { label: 'Auteurs', name: 'authors', widget: 'list', required: false, field: { label: 'Auteur', name: 'auteur', widget: 'string' } },
  {
    label: 'Image',
    name: 'newsImage',
    widget: 'object',
    required: false,
    fields: [
      { label: 'Fichier', name: 'src', widget: 'image', required: false },
      { label: 'Texte de remplacement', name: 'alt', widget: 'string', required: false, hint: 'Ce que montre l’image, pour les personnes qui ne la voient pas.' },
      { label: 'Légende', name: 'legend', widget: 'string', required: false },
      // `caption` sert de légende quand `legend` est vide (nouvelles reprises
      // de coquille-web) ; le crédit est `source`, affiché « Photo : … »
      { label: 'Légende (ancien champ)', name: 'caption', widget: 'string', required: false, hint: 'Affichée seulement si « Légende » est vide. Préférer « Légende ».' },
      { label: 'Crédit photo', name: 'source', widget: 'string', required: false, hint: 'Affiché « Photo : … » sous l’image.' },
    ],
  },
  {
    label: 'Sujets',
    name: 'sujets',
    widget: 'select',
    multiple: true,
    required: false,
    options: SUJETS.map(({ id, libelle }) => ({ label: libelle, value: id })),
  },
  corps,
]

export const GET: APIRoute = async () => {
  const pages = await toutesLesPages()

  // Premier niveau d'une section : modifiable et créable (dossier). Un titre
  // est exigé : il donne le nom du fichier, donc l'adresse de la page.
  const champsPageCreable = champsPage.map((champ) => (champ.name === 'title' ? { ...champ, required: true, hint: 'Titre de l’onglet et des listes. À la création, il donne aussi l’adresse de la page : il ne doit pas reprendre celle d’une page existante du même dossier.' } : champ))
  const collectionPages = {
    name: 'pages',
    label: 'Pages',
    label_singular: 'Page',
    folder: 'src/content/pages',
    extension: 'md',
    format: 'frontmatter',
    create: true,
    delete: false,
    nested: { depth: 10, subfolders: false },
    meta: {
      path: {
        label: 'Emplacement',
        widget: 'select',
        options: dossiersDePages(pages).map(({ chemin, libelle }) => ({ label: libelle, value: chemin })),
        default: '/',
        hint: 'Section ou page parente : la nouvelle page devient une de ses sous-pages (aussi sous une page qui n’en a pas encore). À choisir à la création ; une page existante ne se déplace pas depuis ici.',
      },
    },
    slug: '{{slug}}',
    summary: '{{title}}',
    sortable_fields: ['title'],
    ...imagesACote,
    fields: champsPageCreable,
  }

  // Vitrines (.yaml), l'accueil d'abord puis par titre
  const vitrines = pages
    .filter(estVitrine)
    .sort((a, b) => (a.id === 'index' ? -1 : b.id === 'index' ? 1 : (a.data.title ?? '').localeCompare(b.data.title ?? '', 'fr')))
  const collectionVitrines = {
    name: 'vitrines',
    label: 'Vitrines (accueil et sections)',
    label_singular: 'Vitrine',
    // Format de public/admin/format-vitrine.js : celui de Decap réécrirait
    // tout le fichier (commentaires, lignes vides, textes coupés à 80 colonnes)
    format: 'yaml-vitrine',
    extension: 'yaml',
    files: vitrines.map((vitrine) => ({
      name: vitrine.id.replaceAll('/', '--'),
      label: vitrine.id === 'index' ? 'Accueil' : (vitrine.data.crumbLabel ?? vitrine.data.title ?? vitrine.id),
      file: vitrine.filePath,
      media_folder: 'images',
      public_folder: 'images',
      fields: champsVitrine(bannieres),
    })),
  }

  // Répertoire du personnel : un seul fichier JSON (src/lib/personnel.ts le valide au build)
  // Bibliothèques et unités du répertoire : celles déjà en usage. En texte
  // libre, une coquille créait un filtre de plus et sortait la personne du
  // sien (#sante)
  const unites = [...new Set(personnel().flatMap((p) => p.bibliotheques))].sort((a, b) => a.localeCompare(b, 'fr'))

  const collectionPersonnel = {
    name: 'personnel',
    label: 'Répertoire du personnel',
    files: [
      {
        name: 'personnel',
        label: 'Personnel',
        file: 'src/content/personnel/personnel.json',
        format: 'json',
        media_folder: 'photos',
        public_folder: 'photos',
        fields: [
          {
            label: 'Personnes',
            name: 'personnes',
            widget: 'list',
            collapsed: true,
            summary: '{{fields.nom}}, {{fields.prenom}} · {{fields.fonction}}',
            fields: [
              { label: 'Prénom', name: 'prenom', widget: 'string' },
              { label: 'Nom', name: 'nom', widget: 'string' },
              { label: 'Fonction', name: 'fonction', widget: 'string' },
              { label: 'Direction', name: 'direction', widget: 'string', required: false },
              { label: 'Disciplines', name: 'disciplines', widget: 'list', required: false, field: { label: 'Discipline', name: 'discipline', widget: 'string' }, hint: 'Domaines d’études seulement (ex. psychologie), surtout pour les bibliothécaires disciplinaires. Une discipline par élément.' },
              { label: 'Expertises et services', name: 'expertises', widget: 'list', required: false, field: { label: 'Expertise ou service', name: 'expertise', widget: 'string' }, hint: 'Ce dont la personne s’occupe, hors discipline (ex. Ressources humaines, Papyrus, Prêt entre bibliothèques). Un élément par ligne.' },
              {
                label: 'Bibliothèques et unités',
                name: 'bibliotheques',
                widget: 'select',
                multiple: true,
                required: false,
                options: unites,
                hint: 'Les filtres du répertoire en sont tirés. Une nouvelle unité s’ajoute d’abord dans le fichier personnel.json.',
              },
              { label: 'Téléphone', name: 'telephone', widget: 'string', required: false, hint: 'Ex. 514 343-6111, poste 3585' },
              { label: 'Courriel', name: 'courriel', widget: 'string', required: false, pattern: MOTIF_COURRIEL, hint: 'L’adresse seule, sans « mailto: ». Le lien « Clavarder sur Teams » en est tiré automatiquement (pas pour une boîte partagée, sans point avant @).' },
              { label: 'Photo', name: 'photo', widget: 'image', required: false, hint: 'Carrée, 200 × 200 px, en WebP.' },
            ],
          },
        ],
      },
    ],
  }

  // Revue de presse : un seul fichier JSON, les articles sous la clé `articles`
  const collectionRevueDePresse = {
    name: 'revue-de-presse',
    label: 'Revue de presse',
    files: [
      {
        name: 'articles',
        label: 'Articles',
        file: 'src/content/revue-de-presse/articles.json',
        format: 'json',
        fields: [
          {
            label: 'Articles',
            name: 'articles',
            widget: 'list',
            collapsed: true,
            summary: '{{fields.date}} · {{fields.source}} · {{fields.title}}',
            add_to_top: true,
            hint: 'Le plus récent en haut. La liste du site est triée par date.',
            fields: [
              { label: 'Titre', name: 'title', widget: 'string', hint: 'Le titre de l’article, tel que publié.' },
              { label: 'Date', name: 'date', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'YYYY-MM-DD', time_format: false, hint: 'Date de publication de l’article.' },
              { label: 'Source', name: 'source', widget: 'string', hint: 'Nom du média (ex. Le Devoir, Radio-Canada, UdeMNouvelles).' },
              { label: 'Lien', name: 'url', widget: 'string', pattern: ['^https?://', 'Une adresse complète (https://…)'] },
              { label: 'Langue', name: 'lang', widget: 'string', required: false, hint: 'Seulement si l’article n’est pas en français (ex. en).', pattern: MOTIF_LANGUE },
              {
                label: 'Sujets',
                name: 'sujets',
                widget: 'select',
                multiple: true,
                required: false,
                options: SUJETS.map(({ id, libelle }) => ({ label: libelle, value: id })),
                hint: 'Livres rares : l’article paraît aussi dans la revue de presse de la Bibliothèque des livres rares.',
              },
            ],
          },
        ],
      },
    ],
  }

  const developpement = import.meta.env.DEV
  const config = {
    locale: 'fr',
    // Page de connexion et en-tête ; chemin relatif à /admin/, pour
    // fonctionner aussi dans un sous-dossier (/bibweb/admin/)
    logo: { src: '../images/logo-bib/logo-bib-horizontal.svg', show_in_header: true },
    backend: {
      name: 'github',
      repo: DEPOT,
      branch: 'main',
      // Decap n'accepte le jeton que d'une fenêtre de l'origine base_url
      ...(process.env.DECAP_ORIGINE ? { base_url: process.env.DECAP_ORIGINE, auth_endpoint: pageConnexion } : {}),
      commit_messages: {
        create: 'Création de {{collection}} « {{slug}} »',
        update: 'Modification de {{collection}} « {{slug}} »',
        delete: 'Suppression de {{collection}} « {{slug}} »',
        uploadMedia: 'Ajout de l’image « {{path}} »',
        deleteMedia: 'Suppression de l’image « {{path}} »',
      },
    },
    // Pas d'editorial_workflow : Decap écrit directement dans main
    ...(developpement ? { local_backend: true } : {}),
    // Decap 3 écrit '' pour un champ facultatif vidé (l'option
    // omit_empty_optional_fields n'existe pas dans cette version) : les
    // schémas retirent ces valeurs avant de valider (lib/sans-vides.ts)
    // Images envoyées hors d'une page (rare) ; sinon, dossier images/ de la page
    media_folder: 'public/televersements',
    public_folder: '/televersements',
    slug: { encoding: 'ascii', clean_accents: true, sanitize_replacement: '-' },
    // L'aperçu de Decap ne connaît ni les directives ni les tableaux : il
    // montrerait une page qui n'a rien à voir avec le site
    editor: { preview: false },
    collections: [
      {
        name: 'nouvelles',
        label: 'Nouvelles',
        label_singular: 'Nouvelle',
        folder: 'src/content/nouvelles',
        path: '{{year}}/{{slug}}',
        extension: 'md',
        format: 'frontmatter',
        create: true,
        slug: '{{slug}}',
        summary: '{{date}} · {{title}}',
        // Liste simple : la forme { fields, default } (tri par défaut) n'existe
        // pas dans cette version de Decap, qui refuse alors toute la configuration
        sortable_fields: ['date', 'title'],
        ...imagesACote,
        fields: champsNouvelle,
      },
      collectionRevueDePresse,
      collectionVitrines,
      collectionPersonnel,
      collectionPages,
    ],
  }

  return new Response(JSON.stringify(config, null, 2) + '\n', {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  })
}
