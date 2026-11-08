/*
 * Liens de navigation de la coquille : en-tête et menu (AppBar/menu.js et
 * SideNav/SideNavContent.jsx de coquille-web), pied de page (Footer,
 * LocalFooter, FooterTail) et liens rapides (QuickLinks.jsx). Ils sont
 * définis ici, en dur comme dans la source ; les composants de
 * src/components/coquille/ ne font que les rendre. Les chemins internes
 * reçoivent leur barre oblique finale (trailingSlash: 'always').
 */
import { AddressBookIcon } from '@phosphor-icons/react/dist/ssr/AddressBook'
import { BooksIcon } from '@phosphor-icons/react/dist/ssr/Books'
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/ssr/CalendarDots'
import { ClockCountdownIcon } from '@phosphor-icons/react/dist/ssr/ClockCountdown'
import { DoorOpenIcon } from '@phosphor-icons/react/dist/ssr/DoorOpen'
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info'
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank'
import { InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo'
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt'
import { PersonArmsSpreadIcon } from '@phosphor-icons/react/dist/ssr/PersonArmsSpread'
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User'
import { LaptopIcon } from '@phosphor-icons/react/dist/ssr/Laptop'
import { YoutubeLogoIcon } from '@phosphor-icons/react/dist/ssr/YoutubeLogo'
import studioBib from './images/navigation/studio-bib.webp'
import boiteOutils from './images/navigation/boite-outils.svg'
import autresRessources from './images/navigation/autres-ressources.webp'
import { analyserLien } from '@/lib/liens'

/* ---------- En-tête et menu ---------- */

export const PAGES_PRINCIPALES = [
  { url: '/espaces/', libelle: 'Espaces' },
  { url: '/etudes/', libelle: 'Études' },
  { url: '/recherche/', libelle: 'Recherche' },
  { url: '/enseignement/', libelle: 'Enseignement' },
  { url: '/engagements/', libelle: 'Engagements' },
]

/**
 * Liens du parcours Sofia, à côté de son champ de recherche dans le menu :
 * gérer ses prêts, obtenir un document absent des collections.
 */
export const LIENS_SOFIA = [
  { libelle: 'Mon dossier', href: 'https://umontreal.account.worldcat.org/account', Icone: UserIcon },
  { libelle: 'Obtenir un document', href: '/obtenir/', Icone: BooksIcon },
]

/**
 * Accès rapide du menu, en tuiles bleues. Les adresses absolues s'ouvrent
 * dans un nouvel onglet, comme dans la source. À propos est aussi dans le
 * pied de page. `clair` : tuile bleu clair (texte bleu foncé) au lieu de
 * bleu UdeM, pour ce qui n'est pas une tâche (Nous joindre, À propos).
 */
export const LIENS_MENU = [
  { libelle: 'Horaires et lieux', href: '/horaires/', Icone: ClockCountdownIcon },
  { libelle: 'Réserver une salle', href: 'https://calendrier.bib.umontreal.ca/r', Icone: DoorOpenIcon },
  {
    libelle: 'Formations',
    href: 'https://calendrier.bib.umontreal.ca/calendar?cid=7690&t=m&d=0000-00-00&cal=7690&inc=0',
    Icone: CalendarDotsIcon,
  },
  { libelle: 'Service Accessibilité', href: '/service-accessibilite/', Icone: PersonArmsSpreadIcon },
  { libelle: 'Nous joindre', href: '/nous-joindre/', Icone: AddressBookIcon, clair: true },
  { libelle: 'À propos', href: '/a-propos/', Icone: InfoIcon, clair: true },
]

export type Carte = {
  cle: string
  image: ImageMetadata
  titre: string
  /**
   * Ce que fait le service, sous son nom dans le menu : « Studio·bib » ou
   * « Boîte à outils » ne disent rien à qui ne les connaît pas
   */
  fonction: string
  /** Une phrase sur le service, dans l'aperçu du menu de bureau */
  description: string
  /** Où cherche le champ de recherche du service, dans le menu (portées de la boîte de recherche) */
  portee: 'site' | 'outils' | 'studio'
  liens: { libelle: string; href: string }[]
  appel?: { libelle: string; href: string }
  /** Couleur du liseré (jeton) */
  couleur: string
}

export const CARTES: Carte[] = [
  {
    cle: 'collections',
    image: autresRessources,
    titre: 'Collections',
    fonction: 'Plus de 5,75\u00a0M de titres à portée de clic!',
    portee: 'site',
    description: 'Sofia, le dépôt Papyrus, les bases de données et les collections spéciales numérisées des bibliothèques.',
    liens: [
      { libelle: 'Sofia – collections des bibliothèques', href: 'https://umontreal.on.worldcat.org/discovery?lang=fr' },
      { libelle: 'Papyrus – dépôt institutionnel', href: 'https://umontreal.scholaris.ca/' },
      { libelle: 'Bases de données de A à Z', href: 'https://boite-outils.bib.umontreal.ca/az.php' },
      { libelle: 'Collections spéciales numérisées', href: 'https://collections-speciales.bib.umontreal.ca/' },
      { libelle: 'Obtenir un document', href: '/obtenir/' },
    ],
    couleur: 'var(--vert-pale)',
  },
  {
    cle: 'outils',
    image: boiteOutils,
    titre: 'Boîte à outils',
    fonction: 'Guides pour vos recherches',
    portee: 'outils',
    description: "Des guides et des ressources pour trouver, évaluer et citer l'information, dans chaque discipline.",
    liens: [
      { libelle: 'Bases de données A-Z', href: 'https://boite-outils.bib.umontreal.ca/az.php' },
      { libelle: 'Ressources par discipline', href: 'https://boite-outils.bib.umontreal.ca/disciplines' },
      { libelle: 'Comment citer', href: 'https://boite-outils.bib.umontreal.ca/citer' },
      { libelle: 'Intelligence artificielle générative', href: 'https://boite-outils.bib.umontreal.ca/trouver-evaluer/iag' },
      { libelle: "Droit d'auteur", href: 'https://boite-outils.bib.umontreal.ca/recherche/droit-auteur' },
      { libelle: 'Rédaction de mémoire ou thèse', href: 'https://boite-outils.bib.umontreal.ca/recherche/deposer-these-memoire' },
    ],
    appel: { libelle: 'Explorer la Boîte à outils', href: 'https://boite-outils.bib.umontreal.ca/' },
    couleur: 'var(--rouge-orange)',
  },
  {
    cle: 'studio',
    image: studioBib,
    titre: 'Studio·bib',
    fonction: 'Informatique et création numérique',
    portee: 'studio',
    description: 'Le soutien informatique au quotidien et les technologies de création numérique : impression 3D, réalité virtuelle, production médias.',
    liens: [
      { libelle: 'Accès hors campus', href: 'https://studio.bib.umontreal.ca/informatique/hors-campus/' },
      { libelle: 'Soutien informatique', href: 'https://studio.bib.umontreal.ca/informatique/' },
      { libelle: 'Technologies créatives', href: 'https://studio.bib.umontreal.ca/creatives/' },
      { libelle: 'Productions médias', href: 'https://studio.bib.umontreal.ca/medias/' },
      { libelle: 'Studios balado', href: 'https://studio.bib.umontreal.ca/espaces/studiosbalado/' },
      { libelle: 'Ateliers de fabrication', href: 'https://studio.bib.umontreal.ca/espaces/ateliers/' },
    ],
    appel: { libelle: 'Voir le site Studio·bib', href: 'https://studio.bib.umontreal.ca/' },
    couleur: 'var(--jaune)',
  },
]

/* ---------- Pied de page ---------- */

/**
 * `Icone` : pictogramme Phosphor devant le lien. `point` : pastille de la
 * couleur du service (jeton de tokens.css), comme dans le pied de studio·bib ;
 * un lien a l'un ou l'autre, jamais les deux.
 */
type LienPied = { libelle: string; href: string; rel?: string; Icone?: typeof InfoIcon; point?: string; fonction?: string }

/**
 * Trois colonnes de liens, chacune avec son titre. Correction par rapport à
 * la source : paramètres de suivi Google Analytics (_gl=…) retirés du lien
 * A-Z.
 */
export const COLONNES_PIED: { titre: string; liens: LienPied[] }[] = [
  {
    titre: "Besoin d'aide?",
    liens: [
      { libelle: 'Nous joindre', href: '/nous-joindre/', Icone: PaperPlaneTiltIcon },
      { libelle: 'Mon dossier', href: 'https://umontreal.account.worldcat.org/account', rel: 'noopener noreferrer', Icone: UserIcon },
      { libelle: 'À propos', href: '/a-propos/', Icone: InfoIcon },
    ],
  },
  {
    titre: 'Sites connexes',
    liens: [
      { libelle: 'Boîte à outils', fonction: 'Guides pour vos recherches', href: 'https://boite-outils.bib.umontreal.ca/', point: 'var(--rouge-orange)' },
      { libelle: 'Bases de données A-Z', fonction: 'Ressources électroniques par sujet', href: 'https://boite-outils.bib.umontreal.ca/az.php', point: 'var(--rouge-orange)' },
      { libelle: 'Studio·bib', fonction: 'Informatique et création numérique', href: 'https://studio.bib.umontreal.ca/', point: 'var(--jaune)' },
      { libelle: 'Papyrus', fonction: 'Dépôt institutionnel', href: 'https://umontreal.scholaris.ca/', point: 'var(--vert-fonce)' },
      { libelle: 'GéoIndex', fonction: 'Données géospatiales', href: 'https://geoapp.bibl.ulaval.ca/', rel: 'noopener noreferrer', point: 'var(--bleu-200)' },
      { libelle: 'Collections spéciales', fonction: 'Objets numériques', href: 'https://collections-speciales.bib.umontreal.ca/', point: 'var(--rose-300)' },
    ],
  },
]

/** Icônes seules : le libellé devient leur nom accessible (la source n'en avait pas) */
export const RESEAUX_PIED = [
  { libelle: 'YouTube des Bibliothèques', href: 'https://www.youtube.com/user/BibliothequesUdeM', Icone: YoutubeLogoIcon },
  { libelle: "Instagram de l'Université de Montréal", href: 'https://www.instagram.com/umontreal/', Icone: InstagramLogoIcon },
]

// Numéro insécable (espace et trait d'union) : il ne se coupe jamais en deux
export const URGENCE = { libelle: 'Urgence UdeM 514\u00a0343\u20117771', href: 'tel:+15143437771' }

/** Bas du pied de page, avant le bouton « Paramètres des témoins » */
export const LIENS_QUEUE_PIED = [
  { libelle: 'Confidentialité', href: 'https://vie-privee.umontreal.ca/confidentialite/' },
  { libelle: "Conditions d'utilisation", href: '/conditions-utilisation/' },
  { libelle: 'Accessibilité', href: '/accessibilite-web/' },
]

/* ---------- Groupes de pages ---------- */

/**
 * Pages de premier niveau qui n'appartiennent à aucune section, réunies sous
 * un titre : GabaritPage en fait leur navigation secondaire et le titre de
 * leur bannière. Les URL ne changent pas et le fil d'Ariane suit toujours
 * l'URL (Accueil › Accessibilité web). Une page du site prend le titre de
 * son frontmatter (`secondaryNav.title`, sinon `title`) ; un lien externe
 * donne son libellé.
 */
export const GROUPES_DE_PAGES: { titre: string; liens: { href: string; libelle?: string }[] }[] = [
  {
    titre: 'À propos du site',
    liens: [
      { href: '/accessibilite-web/' },
      { href: '/conditions-utilisation/' },
      { href: 'https://vie-privee.umontreal.ca/confidentialite/', libelle: "Confidentialité (site de l'UdeM)" },
    ],
  },
]

/* ---------- Liens rapides ---------- */

/**
 * Sans `Icone` : l'icône de Sofia (icône maison, pas une icône Phosphor).
 * `court` : libellé visible sous l'icône de la barre mobile ; le nom
 * accessible reste `libelle`, qui doit contenir `court` (WCAG 2.5.3).
 */
export const LIENS_RAPIDES = [
  { libelle: 'Sofia', court: 'Sofia', href: 'https://umontreal.on.worldcat.org/discovery?lang=fr', Icone: null, nouvelOngletBureau: true },
  { libelle: 'Horaires et lieux', court: 'Horaires', href: '/horaires/', Icone: ClockCountdownIcon },
  { libelle: 'Réserver une salle', court: 'Réserver', href: 'https://calendrier.bib.umontreal.ca/r', Icone: CalendarBlankIcon },
  { libelle: 'Informatique : ressources et soutien', court: 'Informatique', href: 'https://studio.bib.umontreal.ca/informatique/', Icone: LaptopIcon },
]

/* ---------- Outils ---------- */

/** Lien hors du site, avec la règle commune (lib/liens) : https://bib.umontreal.ca/… reste interne */
export const estExterne = (href: string) => /^https?:/.test(href) && !analyserLien(href).interne

/** Section courante : le chemin commence par l'URL de la page principale */
export const estCourante = (chemin: string, url: string) => chemin.startsWith(url)
