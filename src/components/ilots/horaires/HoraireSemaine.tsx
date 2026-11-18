import { useRef } from 'preact/hooks'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise'
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft'
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight'
import { formaterDate, formaterPlages, libelleService, servicesDe, type Horaires } from '@/data/horaires/horaires'
import type { Lieu } from '@/data/horaires/lieux'

// « Cette semaine », « Semaine prochaine », « Dans 3 semaines ». Au-delà de
// huit semaines, « Dans 23 semaines » ne situe plus rien : le mois de la
// semaine (« Juin 2027 ») prend le relais.
export function semaineRelative(decalage: number, dates: string[]) {
  if (decalage === 0) return 'Cette semaine'
  if (decalage === 1) return 'Semaine prochaine'
  if (decalage < 8 || !dates[decalage * 7]) return `Dans ${decalage} semaines`
  const mois = formaterDate(dates[decalage * 7], { month: 'long', year: 'numeric' })
  return mois.charAt(0).toUpperCase() + mois.slice(1)
}

// « du 20 octobre au 26 octobre » : la semaine `decalage` de `dates`
export function periodeSemaine(dates: string[], decalage: number) {
  const semaine = dates.slice(decalage * 7, decalage * 7 + 7)
  return semaine.length ? `du ${formaterDate(semaine[0], { day: 'numeric', month: 'long' })} au ${formaterDate(semaine.at(-1)!, { day: 'numeric', month: 'long' })}` : ''
}

interface Props {
  lieu: Lieu
  horaires: Horaires
  dates: string[]
  /** Dernier jour publié par l'API, une fois atteint */
  dernierJour: string | null
  aujourdhui: string | undefined
  decalage: number
  changerDecalage: (d: number) => void
  semaineChargee: (d: number) => boolean
  erreur: Error | null
}

// Tableau de la semaine d'un lieu, avec navigation ← → jusqu'au dernier jour
// publié par l'API (fin de l'année universitaire). La
// semaine affichée est partagée par toutes les fiches de la page : changer de
// semaine dans une fiche change toutes les autres. Un vrai <table> : un
// lecteur d'écran associe chaque horaire à son jour et à son service.
export default function HoraireSemaine({ lieu, horaires, dates, dernierJour, aujourdhui, decalage, changerDecalage, semaineChargee, erreur }: Props) {
  const titreRef = useRef<HTMLParagraphElement>(null)
  const chargee = semaineChargee(decalage)
  const decalageMax = Math.max(Math.floor(dates.length / 7) - 1, 0)
  const semaine = dates.slice(decalage * 7, decalage * 7 + 7)
  const code = lieu.codeBib!
  const services = servicesDe(horaires, code)

  const periode = periodeSemaine(dates, decalage)

  // Le bouton disparaît une fois revenu à la semaine courante : le focus passe
  // au titre de la semaine plutôt que de se perdre.
  function revenir() {
    changerDecalage(0)
    titreRef.current?.focus()
  }

  return (
    <div>
      <div class="ch-semaine-nav">
        {/* Rien avant la semaine courante : la flèche est masquée (visibility,
            qui la retire aussi du clavier) mais garde sa place. */}
        <button
          type="button"
          class="ch-bouton-icone"
          onClick={() => changerDecalage(decalage - 1)}
          disabled={decalage === 0}
          aria-label="Semaine précédente"
          style={{ visibility: decalage === 0 ? 'hidden' : 'visible' }}
        >
          <CaretLeftIcon size={20} aria-hidden="true" />
        </button>
        <div class="ch-semaine-titre">
          {/* Pas de région live ici : la semaine est commune aux 18 fiches,
              c'est la région d'annonce de CarteHoraires qui la dit, une fois. */}
          <p ref={titreRef} tabIndex={-1}>
            {semaineRelative(decalage, dates)} <span>{periode}</span>
          </p>
          {decalage > 0 && (
            <button type="button" class="ch-revenir" onClick={revenir}>
              <ArrowCounterClockwiseIcon size={14} aria-hidden="true" />
              Revenir à cette semaine
            </button>
          )}
        </div>
        <button type="button" class="ch-bouton-icone" onClick={() => changerDecalage(decalage + 1)} disabled={decalage === decalageMax} aria-label="Semaine suivante">
          <CaretRightIcon size={20} aria-hidden="true" />
        </button>
      </div>

      {chargee && services.length === 0 ? (
        <p class="ch-petit">Aucun horaire publié pour cette période.</p>
      ) : !chargee ? (
        erreur ? (
          <p class="ch-petit">L’horaire de cette semaine n’est pas disponible pour le moment.</p>
        ) : (
          // Chargement annoncé une seule fois, par CarteHoraires
          <div class="ch-squelette ch-squelette-tableau" aria-hidden="true" />
        )
      ) : (
        // Sur un écran étroit, le tableau défile dans sa propre zone plutôt que
        // d'élargir la page (WCAG 1.4.10, exception des tableaux de données).
        // La zone prend le focus pour qu'on la fasse défiler au clavier.
        <div class="ch-defilement" role="region" aria-label={`Horaire de la semaine, ${lieu.name}`} tabIndex={0}>
          <table class="ch-tableau">
            <caption class="visuellement-masque">
              Horaire de la semaine {periode}, {lieu.name}
            </caption>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                {services.map((cle) => (
                  <th scope="col" key={cle}>
                    {libelleService(horaires, cle)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semaine.map((date) => {
                const estAujourdhui = date === aujourdhui
                return (
                  <tr key={date} class={estAujourdhui ? 'ch-aujourdhui' : undefined} aria-current={estAujourdhui ? 'date' : undefined}>
                    <th scope="row">
                      {formaterDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}
                      {estAujourdhui && ' (aujourd’hui)'}
                    </th>
                    {/* Après le dernier jour publié, l'API ne dit rien : « Fermé » tromperait */}
                    {services.map((cle) => (
                      <td key={cle}>{dernierJour && date > dernierJour ? 'Horaire non publié' : formaterPlages(horaires.parBib[code][cle][date])}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
