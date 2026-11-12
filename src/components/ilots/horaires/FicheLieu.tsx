import type { ComponentChildren } from 'preact'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut'
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown'
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock'
import { DoorIcon } from '@phosphor-icons/react/dist/ssr/Door'
import { DoorOpenIcon } from '@phosphor-icons/react/dist/ssr/DoorOpen'
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin'
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users'
import HoraireSemaine from './HoraireSemaine'
import { avecBase } from '@/lib/chemin'
import { formaterDistance, lienItineraire, lienTel, type Horaires, type Statut } from '@/data/horaires/horaires'
import type { Lieu } from '@/data/horaires/lieux'

export type ImageLieu = { src: string; srcset: string }

// La pastille n'est qu'un repère visuel en plus du texte du statut ; sa forme
// change aussi (pleine si ouvert, vide si fermé), pour ne pas reposer sur la
// seule couleur.
function StatutLieu({ statut, extra }: { statut: Statut | null; extra?: string[] | null }) {
  if (!statut) return <div class="ch-squelette ch-squelette-ligne" aria-hidden="true" />
  return (
    <p class="ch-statut">
      <span class={`ch-pastille-statut ch-etat-${statut.etat}`} aria-hidden="true" />
      <span class="ch-statut-texte">{statut.texte}</span>
      {extra && extra.length > 0 && <span class="ch-statut-extra">{extra.join(' · ')}</span>}
    </p>
  )
}

// Nom du lieu ajouté, pour les lecteurs d'écran seulement, aux liens et aux
// titres de volets qui reviennent dans chaque fiche (« Itinéraire »,
// « Horaire de la semaine »…) : chacun reste compréhensible seul dans la
// liste des liens ou des titres (WCAG 2.4.9). Le texte visible reste en tête
// (WCAG 2.5.3).
function Contexte({ lieu }: { lieu: Lieu }) {
  return <span class="visuellement-masque"> – {lieu.name}</span>
}

const NouvelOnglet = () => <span class="visuellement-masque"> (nouvel onglet)</span>

// Volet repliable compact, en <details> natif (une fiche en compte jusqu'à
// quatre). Le titre est un niveau sous le nom de la fiche.
function Volet({ lieu, Icone, titre, niveau, children }: { lieu: Lieu; Icone: any; titre: string; niveau: number; children: ComponentChildren }) {
  const Titre = `h${niveau}` as 'h3'
  return (
    <details class="ch-volet volet-anime">
      <summary>
        <Titre class="ch-volet-titre">
          <Icone size={20} aria-hidden="true" />
          {titre}
          <Contexte lieu={lieu} />
        </Titre>
        <CaretDownIcon class="ch-volet-caret" size={18} aria-hidden="true" />
      </summary>
      <div class="ch-volet-contenu">{children}</div>
    </details>
  )
}

function Contacts({ contact }: { contact: NonNullable<Lieu['contact']> }) {
  return (
    <dl class="ch-contacts">
      {contact.map(({ label, phone, email }) => (
        <div key={label}>
          <dt>{label}</dt>
          {phone && <dd>{lienTel(phone) ? <a class="ch-lien" href={lienTel(phone)!}>{phone}</a> : phone}</dd>}
          {email && (
            <dd>
              <a class="ch-lien" href={`mailto:${email}`}>
                {email}
              </a>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

function Espaces({ lieu }: { lieu: Lieu }) {
  return (
    <ul class="ch-espaces">
      {lieu.spaces!.map(({ label, url }) => (
        <li key={label}>
          {!url ? (
            label
          ) : /^https?:/.test(url) ? (
            // Le Studio et le calendrier sont d'autres sites : nouvel onglet,
            // comme les autres liens externes de la fiche.
            <a class="ch-lien ch-lien-icone" href={url} target="_blank" rel="noopener noreferrer">
              {label}
              <Contexte lieu={lieu} />
              <NouvelOnglet />
              <ArrowSquareOutIcon size={16} aria-hidden="true" />
            </a>
          ) : (
            <a class="ch-lien" href={avecBase(url)}>
              {label}
              <Contexte lieu={lieu} />
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

// Un bouton par type de salle ; chacun ouvre le calendrier de réservation
// dans un nouvel onglet.
function Reservations({ lieu }: { lieu: Lieu }) {
  return (
    <div class="ch-reservations">
      {lieu.reservations!.map(({ label, url }) => (
        <a key={label} class="ch-bouton-contour" href={url} target="_blank" rel="noopener noreferrer">
          {label}
          <Contexte lieu={lieu} />
          <NouvelOnglet />
          <ArrowSquareOutIcon size={18} aria-hidden="true" />
        </a>
      ))}
    </div>
  )
}

// Photo du lieu, collée au coin haut-droit de la fiche dès 600 px (masquée en
// dessous, voir fiche-lieu.css). Décorative (le nom est juste à côté) :
// alt vide. La distance s'affiche par-dessus une fois la personne localisée.
function Vignette({ image, distance }: { image: ImageLieu; distance?: number }) {
  return (
    <div class="ch-vignette">
      <img src={image.src} srcSet={image.srcset} sizes="168px" alt="" loading="lazy" decoding="async" />
      {distance != null && <span class="ch-puce-distance">{formaterDistance(distance)}</span>}
    </div>
  )
}

export interface PropsFiche {
  lieu: Lieu
  image?: ImageLieu
  /** Distingue la copie de « Les plus proches de vous », qui ne garde pas l'id nu */
  prefixeId?: string
  niveauTitre?: number
  compact?: boolean
  statut: Statut | null
  extra?: string[] | null
  distance?: number
  horaires?: Horaires | null
  dates?: string[]
  aujourdhui?: string
  erreur?: Error | null
  decalage?: number
  changerDecalage?: (d: number) => void
  semaineChargee?: (d: number) => boolean
  plateforme: string | null
  surlignee?: boolean
  voirSurCarte?: (id: string) => void
  voirFiche?: (id: string) => void
}

// Les ancres /horaires/#<id> visent toujours la fiche de la liste. `compact`
// donne la version courte de « Les plus proches de vous » : le pavillon au
// lieu de l'adresse, « Itinéraire » et « Voir la fiche », sans note ni volets.
export default function FicheLieu(props: PropsFiche) {
  const { lieu, image, prefixeId = '', niveauTitre = 2, compact = false, statut, extra, distance, horaires, dates, aujourdhui, erreur = null } = props
  const { decalage = 0, changerDecalage, semaineChargee, plateforme, surlignee, voirSurCarte, voirFiche } = props
  const uid = `${prefixeId}${lieu.id}`
  const Titre = `h${niveauTitre}` as 'h2'
  const niveauVolet = niveauTitre + 1
  const situe = lieu.lat != null && lieu.lng != null
  const sousTitre = compact ? lieu.pavillon : lieu.addr

  return (
    <article id={uid} aria-labelledby={`${uid}-nom`} tabIndex={-1} class={['ch-fiche', 'surface-claire', compact && 'ch-compacte', surlignee && 'ch-surlignee'].filter(Boolean).join(' ')}>
      {/* L'image reste dans la partie haute : les volets passent dessous, sur toute la largeur. */}
      <div class="ch-fiche-haut">
        <div class="ch-fiche-texte">
          <div class="ch-fiche-entete">
            <Titre id={`${uid}-nom`} class="ch-fiche-nom">
              {lieu.name}
            </Titre>
            {distance != null && <span class={`ch-puce-distance ch-puce-statique${image ? ' ch-puce-sans-vignette' : ''}`}>{formaterDistance(distance)}</span>}
          </div>

          {sousTitre && (
            <p class="ch-adresse">
              <MapPinIcon size={18} aria-hidden="true" />
              {sousTitre}
            </p>
          )}

          <StatutLieu statut={statut} extra={compact ? null : extra} />

          {!compact && lieu.note && (
            <p class="ch-note">
              {lieu.note}
              {lieu.noteLink && (
                <>
                  {' '}
                  <a class="ch-lien ch-lien-icone ch-gras" href={avecBase(lieu.noteLink.url)}>
                    {lieu.noteLink.label}
                    <ArrowSquareOutIcon size={18} aria-hidden="true" />
                  </a>
                </>
              )}
            </p>
          )}

          <div class="ch-actions">
            {!compact && situe && (
              <button type="button" class="ch-bouton-texte" onClick={() => voirSurCarte?.(lieu.id)}>
                Voir sur la carte
                <Contexte lieu={lieu} />
              </button>
            )}
            {situe && (
              <a class="ch-lien ch-lien-icone" href={lienItineraire(lieu, plateforme)} target="_blank" rel="noopener noreferrer">
                Itinéraire
                <Contexte lieu={lieu} />
                <NouvelOnglet />
                <ArrowSquareOutIcon size={18} aria-hidden="true" />
              </a>
            )}
            {compact && (
              <a
                class="ch-lien ch-lien-icone"
                href={`#${lieu.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  voirFiche?.(lieu.id)
                }}
              >
                Voir la fiche
                <Contexte lieu={lieu} />
                <ArrowRightIcon size={18} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        {image && <Vignette image={image} distance={distance} />}
      </div>

      {!compact && lieu.codeBib && (
        <Volet lieu={lieu} niveau={niveauVolet} Icone={ClockIcon} titre="Horaire de la semaine">
          {horaires ? (
            <HoraireSemaine
              lieu={lieu}
              horaires={horaires}
              dates={dates ?? []}
              aujourdhui={aujourdhui}
              decalage={decalage}
              changerDecalage={changerDecalage!}
              semaineChargee={semaineChargee!}
              erreur={erreur}
            />
          ) : erreur ? (
            // Message et « Réessayer » : une seule fois, en haut de la page (CarteHoraires)
            <p class="ch-petit">L’horaire n’est pas disponible pour le moment.</p>
          ) : (
            // Chargement annoncé une seule fois, par CarteHoraires
            <div class="ch-squelette ch-squelette-tableau" aria-hidden="true" />
          )}
        </Volet>
      )}
      {!compact && (Boolean(lieu.contact?.length) || lieu.staffFragment) && (
        <Volet lieu={lieu} niveau={niveauVolet} Icone={UsersIcon} titre="Nous joindre">
          {lieu.contact?.length ? <Contacts contact={lieu.contact} /> : null}
          {lieu.staffFragment && (
            <a class="ch-lien ch-lien-icone ch-gras ch-repertoire" href={avecBase(`/nous-joindre/notre-equipe/#${lieu.staffFragment}`)}>
              Répertoire du personnel
              <Contexte lieu={lieu} />
              <ArrowRightIcon size={18} aria-hidden="true" />
            </a>
          )}
        </Volet>
      )}
      {!compact && Boolean(lieu.spaces?.length) && (
        <Volet lieu={lieu} niveau={niveauVolet} Icone={DoorIcon} titre="Espaces">
          <Espaces lieu={lieu} />
        </Volet>
      )}
      {!compact && Boolean(lieu.reservations?.length) && (
        <Volet lieu={lieu} niveau={niveauVolet} Icone={DoorOpenIcon} titre="Réserver une salle">
          <Reservations lieu={lieu} />
        </Volet>
      )}
    </article>
  )
}
