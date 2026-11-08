/*
 * Schéma des vitrines (pages d'accueil et de section en YAML).
 *
 * Une vitrine décrit le contenu (textes, liens, images, icônes) ; la mise en
 * page vient du code (GabaritVitrine.astro et les blocs de ce dossier). Le
 * schéma est volontairement strict : une clé inconnue (faute de frappe), une
 * couleur hors du thème, une icône ou une bannière introuvable font échouer
 * le build avec le nom du fichier et le chemin de la valeur fautive.
 *
 * Chaque élément de `sections` est une bande pleine largeur qui contient un
 * bloc ; `type` choisit le bloc. Documentation pour les rédacteurs :
 * docs/REDACTION.md.
 */
import { z } from 'astro/zod'
import { NOMS_FONDS } from '@/lib/fonds'
import { messageIconeInconnue, trouverIcone } from '@/plugins/icones.mjs'
import { lieuxAvecFiche } from '@/data/horaires/lieux'
import { NOMS_BANNIERES } from '@/lib/bannieres'

// ---- Valeurs communes ----

const texteCourt = z.string().trim().min(1)

/**
 * Texte en Markdown (paragraphes, gras, liens, listes). Pas de HTML : une
 * balise saisie dans le CMS (<script>, <div style>…) serait publiée telle
 * quelle ; le build la refuse et nomme le champ. Une comparaison « 3 < 5 »
 * reste permise (seule une balise est visée).
 */
const BALISE_HTML = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?\/?>|<!--/i
const markdown = z
  .string()
  .trim()
  .min(1)
  .refine((texte) => !BALISE_HTML.test(texte), 'Pas de HTML dans un texte : utilisez le Markdown (**gras**, [lien](/adresse/), listes « - »)')

const lien = z
  .string()
  .trim()
  .regex(/^(\/|#|https?:\/\/|mailto:|tel:)/, 'Un lien commence par / (page du site), # (ancre), https://, mailto: ou tel:')

const icone = z
  .string()
  .trim()
  .superRefine((nom, ctx) => {
    if (!trouverIcone(nom)) ctx.addIssue({ code: 'custom', message: messageIconeInconnue(nom) })
  })

const couleur = z.enum(NOMS_FONDS)

// Ancre d'un titre (/recherche/#orcid) : lettres minuscules, chiffres, tirets
const ancre = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Une ancre s’écrit en minuscules, sans accents ni espaces (ex. droit-auteur)')

// `secondaire` : bouton texte (bleu, sans fond), pour une action moins
// importante que sa voisine (enseignement : « Voir des sujets de formation »).
// `contour` : bouton à contour (pilule bordée, sans fond), entre le plein et
// le texte (espaces : engagements en équité, diversité, inclusion)
const bouton = z.object({ texte: texteCourt, lien, secondaire: z.boolean().optional(), contour: z.boolean().optional() }).strict()
const boutons = z.array(bouton).min(1)

// Lien « tout voir » sous un carrousel ou une liste
// `nouvelOnglet` : pour une application externe qu'on garde ouverte à côté
// du site (réservation de salles d'/espaces/, comme dans la source)
const lienTout = z.object({ texte: texteCourt, lien, nouvelOnglet: z.boolean().optional() }).strict()

// Lignes courtes (sous-titre de bannière)
const lignes = z.array(texteCourt).min(1)

// Bannières : fichiers de src/content/pages/images/super-heroes/, par nom (lib/bannieres)
const BANNIERES = NOMS_BANNIERES

// Hauteur de la photo à garder au recadrage : 0 % le haut, 50 % le centre
const cadrage = z.string().regex(/^(100|[1-9]?\d)%$/, { message: 'Le cadrage est un pourcentage de 0% à 100% (0% : le haut de la photo, 50% : le centre).' })

// `rechercheSofia` : la grande bannière de l'accueil (BanniereAccueil), avec la
// boîte de recherche Sofia en bas ; sinon, la bannière des sections
// (BannierePage), en deux hauteurs
const champsBanniere = {
  titre: texteCourt,
  image: z.string().refine((nom) => BANNIERES.includes(nom), { message: `Bannière introuvable. Noms possibles : ${BANNIERES.join(', ')}` }),
  sousTitre: lignes.optional(),
  /** Bouton sous le titre (bannière des sections seulement) */
  bouton: bouton.optional(),
  taille: z.enum(['normale', 'petite']).default('normale'),
  /** Police du titre réduite (bannière des sections) ; automatique au-delà de 45 caractères */
  titreReduit: z.boolean().optional(),
  /** Hauteur de la photo à garder au recadrage : 0 % le haut, 50 % le centre */
  cadrage: cadrage.optional(),
  rechercheSofia: z.boolean().optional(),
}

/**
 * Bannière ; `portraits` (accueil, avec `rechercheSofia`) : une photo tirée
 * au hasard à chaque chargement, avec son titre (slogan), le nom et la
 * fonction de la personne ; `image` devient alors facultative. Sans
 * JavaScript, le premier portrait s'affiche ; il sert aussi d'image de
 * partage.
 */
function banniere<I extends z.ZodType>(image: () => I) {
  const portrait = z
    .object({
      image: image(),
      /** Slogan en titre de la bannière, avec cette photo */
      titre: texteCourt,
      nom: texteCourt,
      fonction: texteCourt,
      /** Hauteur de la photo à garder au recadrage, si elle diffère de celle de la bannière */
      cadrage: cadrage.optional(),
      /** Position gardée quand la photo est coupée sur les côtés (téléphone, tablette en portrait) : 0 % la gauche, 50 % le centre */
      cadrageHorizontal: cadrage.optional(),
      /** Téléphone : remonte la photo de ce pourcentage de sa hauteur, pour dégager le visage du texte */
      decalageMobile: cadrage.optional(),
    })
    .strict()
  return z
    .object({ ...champsBanniere, image: champsBanniere.image.optional(), portraits: z.array(portrait).min(1).optional() })
    .strict()
    .refine((b) => !b.portraits || b.rechercheSofia, { message: 'Les portraits vont seulement dans la grande bannière de l’accueil (`rechercheSofia: true`).', path: ['portraits'] })
    .refine((b) => b.image || b.portraits, { message: 'Une bannière a une image (`image`) ou des portraits (`portraits`).', path: ['image'] })
}

// Ancre d'une fiche de bibliothèque (fiche.id dans src/data/horaires/lieux.ts)
const IDS_FICHES = lieuxAvecFiche.map((lieu) => lieu.fiche!.id)
const bibliotheque = z.string().refine((id) => IDS_FICHES.includes(id), { message: `Bibliothèque inconnue. Noms possibles : ${IDS_FICHES.join(', ')}` })

// ---- Blocs ----

/** Champs de toute section : fond de la bande et ancre du titre */
const communs = {
  fond: couleur.optional(),
  id: ancre.optional(),
  /** Nom court du bloc dans le sommaire « Sur cette page » (Sommaire.astro) ; sans libellé, le bloc n'y figure pas */
  libelle: texteCourt.optional(),
}

// Génériques : les types générés par Astro (CollectionEntry<'vitrines'>)
// gardent ainsi ceux de image(), de secondaryNav et de lang
export function schemaVitrine<I extends z.ZodType, N extends z.ZodType, L extends z.ZodType>(
  image: () => I,
  { secondaryNav, lang }: { secondaryNav: N; lang: L },
) {
  /** Texte et image côte à côte (BandeImageTexte) */
  const imageTexte = z
    .object({
      type: z.literal('image-texte'),
      ...communs,
      titre: texteCourt,
      texte: markdown,
      image: image(),
      /** Légende sous l'image : ce qu'on y voit (Markdown sur une ligne : italique, lien) */
      legende: texteCourt.optional(),
      /** Texte de remplacement, pour une image qui porte un message (logo de campagne, texte) ; sans lui, l'image est décorative */
      alt: texteCourt.optional(),
      positionImage: z.enum(['gauche', 'droite']).default('droite'),
      /** `encart` : carte rose pâle ramassée, texte et bouton bleu foncé, image fondue au bord (BlocImageTexte) */
      disposition: z.enum(['colonnes', 'encart']).default('colonnes'),
      /** Encart : couleur de la carte, rose pâle (espaces), vert foncé (études : « Besoin d’aide? ») ou bleu UdeM (recherche : « Premier arrêt »), texte blanc sur les deux derniers */
      teinteEncart: z.enum(['rose', 'vertFonce', 'bleu']).default('rose'),
      /** Encart : hauteur de la photo gardée quand elle est recadrée (bandeau sur tablette) : 0 % le haut, 50 % le centre */
      cadrage: cadrage.optional(),
      /** Encart : position gardée quand la photo est coupée sur les côtés (téléphone) : 0 % la gauche, 50 % le centre */
      cadrageHorizontal: cadrage.optional(),
      /** Colonnes : l'image remplit sa colonne à la hauteur du texte, recadrée (image en portrait) */
      recadrerImage: z.boolean().optional(),
      /** Colonnes : le titre se place dans la colonne du texte, à côté de l'image (`false` : au-dessus, pleine largeur) */
      titreEnColonne: z.boolean().default(true),
      /** Colonnes : l'image prend 88 % de sa colonne dès 900 px (`false` : toute la colonne) */
      imageReduite: z.boolean().default(true),
      /** Colonnes : `petite` réduit l'image aux deux tiers de sa colonne (études : « Besoin d’aide? ») */
      tailleImage: z.enum(['normale', 'petite']).default('normale'),
      /** Colonnes : icônes légendées sous le texte, deux par rangée dès 600 px (études : Service Accessibilité) */
      icones: z.array(z.object({ icone, texte: texteCourt }).strict()).min(1).optional(),
      /** Couleur des icônes (par défaut : bleu principal, blanc sur un fond foncé) */
      couleurIcones: couleur.optional(),
      bouton: bouton.optional(),
      boutons: boutons.optional(),
    })
    .strict()
    .refine((bloc) => !bloc.icones || bloc.disposition === 'colonnes', { message: 'Les `icones` ne vont qu’avec la disposition `colonnes`' })

  /** Cartes-sections côte à côte : photo, titre, texte et bouton sur leur fond (BlocCartesSections) */
  const cartesSections = z
    .object({
      type: z.literal('cartes-sections'),
      ...communs,
      cartes: z
        .array(
          z
            .object({
              titre: texteCourt,
              id: ancre.optional(),
              texte: markdown,
              image: image(),
              fond: couleur.optional(),
              bouton: bouton.optional(),
            })
            .strict(),
        )
        .min(2)
        .max(4),
    })
    .strict()

  /** Carte-lien à icône (CarteIcone) */
  const carteIcone = z.object({ titre: texteCourt, icone, lien, appel: texteCourt.optional() }).strict()

  /** Carte-lien à photo (CarteImage) */
  const carteImage = z.object({ titre: texteCourt, image: image(), lien, appel: texteCourt.optional() }).strict()

  /** Volet d'accordéon : titre, texte et, au besoin, coordonnées à icônes */
  const volet = z
    .object({
      titre: texteCourt,
      id: ancre.optional(),
      texte: markdown.optional(),
      coordonnees: z
        .object({
          courriel: z.string().trim().email().optional(),
          /** Écrit comme on l'affiche : 514 343-2135 */
          telephone: z.string().trim().regex(/^[0-9 -]+$/, 'Un numéro de téléphone s’écrit avec des chiffres, des espaces et des tirets').optional(),
          adresse: lignes.optional(),
          itineraire: lien.optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
  const couleurAccordeons = z.enum(['bleuPrincipal', 'rose', 'vertPale']).default('bleuPrincipal')

  /** Vidéo YouTube sous un titre et un texte (VideoYouTube) */
  const video = z
    .object({
      type: z.literal('video'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      /** Identifiant YouTube : les 11 caractères après « watch?v= » */
      youtube: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'L’identifiant YouTube a 11 caractères : ce qui suit « watch?v= » dans l’adresse de la vidéo'),
      /** Titre de la vidéo, annoncé sur le bouton de lecture et le lecteur */
      titreVideo: texteCourt,
      /** Page de la transcription (WCAG 1.2) */
      transcription: lien.optional(),
    })
    .strict()

  /** Titre et texte à gauche, grille d'icônes à droite (HeroWithText2) */
  const texteIcones = z
    .object({
      type: z.literal('texte-icones'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      bouton: bouton.optional(),
      boutons: boutons.optional(),
      couleurIcones: couleur,
      icones: z.array(z.object({ icone, texte: texteCourt }).strict()).min(1),
    })
    .strict()

  /** Grande icône dans un carré à gauche, titre et texte à droite (HeroWithText et IconeCarree) */
  const iconeTexte = z
    .object({
      type: z.literal('icone-texte'),
      ...communs,
      icone,
      couleurIcone: z.union([couleur, z.literal('blanc')]),
      titre: texteCourt,
      texte: markdown,
      boutons: boutons.optional(),
      /** Accordéons sous le bloc (engagements : principes de l'IA) */
      accordeons: z.array(volet).min(1).optional(),
      couleurAccordeons: couleurAccordeons,
    })
    .strict()

  /** Titre, texte et liste de liens décrits (ListeLiens). Sans `titre`, les
   *  titres des liens deviennent les h2 de la page (a-propos, obtenir). */
  const listeLiens = z
    .object({
      type: z.literal('liste-liens'),
      ...communs,
      titre: texteCourt.optional(),
      texte: markdown.optional(),
      /** `cartes` : cartes compactes à icône (style studio·bib), deux par rangée dès 600 px (nous-joindre) */
      presentation: z.enum(['liste', 'cartes']).default('liste'),
      liens: z
        .array(z.object({ titre: texteCourt, description: texteCourt.optional(), lien, appel: texteCourt.optional(), icone: icone.optional() }).strict())
        .min(1),
    })
    .strict()
    // Les icônes ne s'affichent que sur les cartes : en liste, elles seraient ignorées sans avertir
    .refine((b) => b.presentation === 'cartes' || b.liens.every((l) => !l.icone), { message: 'Les icônes des liens ne s’affichent qu’avec « presentation: cartes »', path: ['presentation'] })

  /** Titre, texte et rangée de boutons */
  const texte = z
    .object({
      type: z.literal('texte'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      boutons: boutons.optional(),
    })
    .strict()

  /** Quoi de neuf de l'accueil : événements, nouvelles et formations (QuoiDeNeuf) */
  const quoiDeNeuf = z
    .object({
      type: z.literal('quoi-de-neuf'),
      ...communs,
      titre: texteCourt,
      nombre: z.number().int().min(1).max(10).default(4),
    })
    .strict()

  /** Cartes à icône compactes, en rangées de deux dès 600 px (GrilleElargissable) */
  const grilleElargissable = z
    .object({
      type: z.literal('grille-elargissable'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      couleurCartes: z.enum(['bleuPrincipal', 'vertFonce', 'rose300', 'jaune']).default('bleuPrincipal'),
      /** Une carte sans `lien` annonce ce qui s'en vient (« Bientôt ») : ni lien ni flèche, comme dans le carrousel */
      cartes: z.array(carteIcone.extend({ lien: lien.optional() })).min(1),
      bouton: bouton.optional(),
    })
    .strict()

  /** Photo en fond de bande, texte dans la moitié droite (Section image) */
  const imageFond = z
    .object({
      type: z.literal('image-fond'),
      ...communs,
      fond: z.never().optional(),
      titre: texteCourt,
      texte: markdown,
      image: image(),
      /** Hauteur de la photo gardée au recadrage, comme la bannière */
      cadrage: cadrage.optional(),
      bouton: bouton.optional(),
    })
    .strict()

  /** Carte qui se retourne : photo (CarteRevelationImage) ou icône sur fond uni (CarteRevelationFond) */
  const carteRevelation = z
    .object({
      titre: texteCourt,
      sousTitre: texteCourt.optional(),
      image: image().optional(),
      icone: icone.optional(),
      texte: markdown.optional(),
      bouton: bouton.optional(),
    })
    .strict()
    .refine((carte) => Boolean(carte.image) !== Boolean(carte.icone), { message: 'Une carte à révélation a soit une `image`, soit une `icone` (une seule des deux)' })

  /** Carrousel de cartes à révélation (Carrousel) */
  const cartesRevelation = z
    .object({
      type: z.literal('cartes-revelation'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      /** Fond des cartes à icône */
      couleurCartes: z.enum(['bleuPrincipal', 'rose300', 'vertFonce']).default('bleuPrincipal'),
      /** `compacte` : cartes dépliables en rangées de deux (CarteDepliable) au lieu du carrousel ; cartes à icône seulement */
      disposition: z.enum(['carrousel', 'compacte']).default('carrousel'),
      cartes: z.array(carteRevelation).min(1),
      lienTout: lienTout.optional(),
    })
    .strict()
    .refine((bloc) => bloc.disposition !== 'compacte' || bloc.cartes.every((carte) => carte.icone && !carte.bouton), {
      message: 'La disposition `compacte` demande des cartes à `icone`, sans `bouton`',
    })

  /** Carrousel de cartes à photo (Carrousel et CarteImage) */
  const carrouselImages = z
    .object({
      type: z.literal('carrousel-images'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      /** Titres des cartes en Figtree (sans empattement) au lieu de Lora */
      titresSansSerif: z.boolean().optional(),
      cartes: z.array(carteImage).min(1),
    })
    .strict()

  /** Grille de cartes à photo (CarteImage). Sans `titre`, les titres des
   *  cartes deviennent les h2 de la page (nous-soutenir). */
  const cartesImages = z
    .object({
      type: z.literal('cartes-images'),
      ...communs,
      titre: texteCourt.optional(),
      texte: markdown.optional(),
      cartes: z.array(carteImage).min(1),
    })
    .strict()

  /** Accordéons (GroupeAccordeons) sous un titre */
  const accordeons = z
    .object({
      type: z.literal('accordeons'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      couleur: couleurAccordeons,
      volets: z.array(volet).min(1),
    })
    .strict()

  /** Membres du personnel d'une bibliothèque (RepertoirePersonnel, sans les filtres) */
  const personnel = z
    .object({
      type: z.literal('personnel'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      bibliotheque,
      /** Noms (prénom et nom, comme dans le répertoire du personnel) dans l'ordre d'affichage ; les autres suivent par ordre alphabétique */
      ordre: z.array(texteCourt).min(1).optional(),
      /** Lien vers le répertoire complet, sous les fiches */
      lienTout: lienTout.optional(),
      /** Coordonnées de la bibliothèque, dans une colonne à gauche de l'équipe */
      coordonnees: z.object({ titre: texteCourt, texte: markdown, bouton: bouton.optional() }).strict().optional(),
    })
    .strict()

  /** Prochaines formations, en deux colonnes côte à côte (ListeFormationsAccueil) */
  const formations = z
    .object({
      type: z.literal('formations'),
      ...communs,
      titre: texteCourt,
      texte: markdown.optional(),
      /** Nombre de formations, réparties en deux colonnes (pair de préférence) */
      nombre: z.number().int().min(2).max(20).default(8),
      lienTout: lienTout.optional(),
    })
    .strict()

  const bloc = z.discriminatedUnion('type', [
    imageTexte,
    cartesSections,
    texteIcones,
    iconeTexte,
    listeLiens,
    texte,
    quoiDeNeuf,
    grilleElargissable,
    imageFond,
    cartesRevelation,
    carrouselImages,
    cartesImages,
    accordeons,
    personnel,
    video,
    formations,
  ])

  return z
    .object({
      // Mêmes noms que le frontmatter des pages de texte : fil d'Ariane,
      // navigation secondaire et recherche les lisent de la même façon
      title: texteCourt,
      crumbLabel: texteCourt.optional(),
      description: z.string().optional(),
      secondaryNav,
      noindex: z.boolean().optional(),
      lang,
      banniere: banniere(image).optional(),
      sections: z.array(bloc).min(1),
    })
    .strict()
}
