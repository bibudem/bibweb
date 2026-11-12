import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise'
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp'
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock'
import { CrosshairIcon } from '@phosphor-icons/react/dist/ssr/Crosshair'
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info'
import CarteLeaflet from './CarteLeaflet'
import FicheLieu, { type ImageLieu } from './FicheLieu'
import { periodeSemaine, semaineRelative } from './HoraireSemaine'
import RechercheLieu from './RechercheLieu'
import useHoraires from './useHoraires'
import { autresServicesDuJour, correspond, dansFiltre, formaterDistance, haversine, maintenantMontreal, normaliser, statutDe, type Maintenant, type Statut } from '@/data/horaires/horaires'
import type { Lieu } from '@/data/horaires/lieux'
import '@/components/contenu/dynamiques/etat-erreur.css'
// Une feuille par composant de l'îlot, toutes importées ici : l'ordre de la
// cascade est celui de l'ancienne feuille unique (base, puis composants)
import './carte-horaires.css'
import './recherche-lieu.css'
import './carte-leaflet.css'
import './fiche-lieu.css'
import './horaire-semaine.css'
import { idDeLAncre } from '@/lib/ancre-url'

// La pastille reprend la couleur des marqueurs de la carte : les filtres
// servent aussi de légende.
const FILTRES: [string, string, string?][] = [
  ['all', 'Tous les lieux'],
  ['library', 'Bibliothèques', 'bleu-principal'],
  ['conservation', 'Centres de conservation', 'vert-pale'],
  ['studios', 'Studios et ateliers', 'jaune'],
  ['points-service', 'Points de service', 'violet-fonce'],
]

const MESSAGE_ERREUR = 'Les horaires ne sont pas disponibles pour le moment.'

const Pastille = ({ couleur }: { couleur: string }) => <span class="ch-pastille" style={{ backgroundColor: `var(--${couleur})` }} aria-hidden="true" />

// Tri alphabétique sur le nom propre : « Bibliothèque de droit » se range à
// D, « Bibliothèque Hubert-Reeves » à H.
const PREFIXE = /^(bibliothèque|point de service|service du)\s+(de la |de l'|des |du |de |d'|l')?/i
const cleTri = (lieu: Lieu) => lieu.name.replace(PREFIXE, '')

// Les bibliothèques d'abord ; les centres de conservation, les points de
// service et le Prêt entre bibliothèques en fin de liste.
const ORDRE_ZONES: Record<string, number> = { conservation: 1, 'points-service': 2, service: 3 }
const rangZone = (lieu: Lieu) => ORDRE_ZONES[lieu.zone] ?? 0
const comparer = (a: Lieu, b: Lieu) => rangZone(a) - rangZone(b) || cleTri(a).localeCompare(cleTri(b), 'fr', { sensitivity: 'base' })

const estOuvert = (s: Statut | null) => s?.etat === 'open' || s?.etat === 'closing-soon'

const SURLIGNAGE_MS = 1600
const HORLOGE_MS = 30 * 1000

const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Props {
  lieux: Lieu[]
  images: Record<string, ImageLieu>
}

export default function CarteHoraires({ lieux, images }: Props) {
  // Le Prêt entre bibliothèques est un service, pas un lieu : ni adresse ni
  // marqueur, il est présenté à part, sous la liste des lieux.
  const physiques = useMemo(() => lieux.filter((l) => l.zone !== 'service'), [lieux])
  const services = useMemo(() => lieux.filter((l) => l.zone === 'service'), [lieux])
  const surCarte = useMemo(() => lieux.filter((l) => l.lat != null && l.lng != null), [lieux])

  // L'heure n'existe que dans le navigateur : au rendu serveur (et au premier
  // rendu client), les fiches n'ont pas de statut, ce qui garde le HTML
  // identique à l'hydratation.
  const [maintenant, setMaintenant] = useState<Maintenant | null>(null)
  const [plateforme, setPlateforme] = useState<string | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [localisation, setLocalisation] = useState({ occupe: false, message: '' })
  const [filtre, setFiltre] = useState('all')
  const [ouvertsSeulement, setOuvertsSeulement] = useState(false)
  // Semaine affichée dans « Horaire de la semaine » (0 = semaine courante),
  // commune à toutes les fiches.
  const [decalage, setDecalage] = useState(0)
  const [requete, setRequete] = useState('')
  const [surlignee, setSurlignee] = useState<string | null>(null)
  const [cibleCarte, setCibleCarte] = useState<{ id: string } | null>(null)
  const sectionCarteRef = useRef<HTMLDivElement>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const tic = () => setMaintenant(maintenantMontreal())
    tic()
    const id = setInterval(tic, HORLOGE_MS)
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)) setPlateforme('ios')
    else if (/android/i.test(ua)) setPlateforme('android')
    return () => {
      clearInterval(id)
      clearTimeout(minuterie.current)
    }
  }, [])

  const { horaires, dates, erreur, assurerSemaine, semaineChargee, reessayer } = useHoraires(maintenant?.date ?? null)
  const erreurRef = useRef<HTMLDivElement>(null)
  // Vrai dès qu'on a changé de semaine : l'annonce dit alors la semaine affichée
  const [navigue, setNavigue] = useState(false)
  const changerDecalage = useCallback((d: number) => {
    setNavigue(true)
    setDecalage(d)
  }, [])

  // Une seule région d'annonce pour toute la page : chaque fiche avait la
  // sienne, et 18 « Chargement… » partaient en même temps. Elle dit le
  // chargement, puis son résultat, puis la semaine affichée (commune à
  // toutes les fiches).
  const annonce = !maintenant
    ? ''
    : erreur
      ? MESSAGE_ERREUR
      : !horaires
        ? 'Chargement des horaires…'
        : !navigue
          ? 'Horaires chargés.'
          : !semaineChargee(decalage)
            ? 'Chargement de l’horaire de la semaine…'
            : `Horaire de la semaine : ${semaineRelative(decalage).toLowerCase()}, ${periodeSemaine(dates, decalage)}.`

  // « Réessayer » disparaît pendant la requête : le focus reste à sa place
  function relancer() {
    erreurRef.current?.focus()
    reessayer()
  }

  useEffect(() => assurerSemaine(decalage), [decalage, assurerSemaine])

  const distances = useMemo<Record<string, number>>(() => {
    if (!position) return {}
    return Object.fromEntries(surCarte.map((l) => [l.id, haversine(position.lat, position.lng, l.lat!, l.lng!)]))
  }, [position, surCarte])

  const statutDu = useCallback(
    (lieu: Lieu) => {
      if (!maintenant) return null
      if (lieu.codeBib && !horaires && !erreur) return null
      return statutDe(lieu, horaires, maintenant, dates)
    },
    [maintenant, horaires, erreur, dates]
  )

  // « Ouvert maintenant » n'est utilisable qu'une fois les statuts connus.
  const statutsPrets = Boolean(maintenant && horaires)
  const garder = useCallback((l: Lieu) => dansFiltre(l, filtre) && (!ouvertsSeulement || estOuvert(statutDu(l))), [filtre, ouvertsSeulement, statutDu])

  const filtres = useMemo(() => physiques.filter(garder), [physiques, garder])
  const idsVisibles = useMemo(() => new Set(filtres.map((l) => l.id)), [filtres])
  const q = normaliser(requete.trim())

  const liste = useMemo(() => {
    const triee = filtres.filter((l) => correspond(l, q))
    if (position) triee.sort((a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity))
    else triee.sort(comparer)
    return triee
  }, [filtres, q, position, distances])

  // Le service (PEB) suit la recherche et « Ouvert maintenant », mais pas les
  // filtres de lieux.
  const autresServices = services.filter((l) => filtre === 'all' && correspond(l, q) && (!ouvertsSeulement || estOuvert(statutDu(l))))

  const parDistance = useMemo(() => {
    if (!position) return []
    return filtres.filter((l) => distances[l.id] != null).sort((a, b) => distances[a.id] - distances[b.id])
  }, [filtres, position, distances])
  const plusProches = parDistance.slice(0, 3)
  // Si aucun des trois plus proches n'est ouvert, on signale le lieu ouvert
  // le plus proche.
  const plusProcheOuvert = statutsPrets && !plusProches.some((l) => estOuvert(statutDu(l))) ? parDistance.find((l) => estOuvert(statutDu(l))) : undefined

  function localiser() {
    if (!navigator.geolocation) {
      setLocalisation({ occupe: false, message: 'La géolocalisation n’est pas offerte par ce navigateur.' })
      return
    }
    setLocalisation({ occupe: true, message: 'Localisation en cours…' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocalisation({ occupe: false, message: 'Position obtenue. Les lieux sont triés du plus proche au plus éloigné.' })
      },
      (err) => {
        setLocalisation({
          occupe: false,
          message: err.code === err.PERMISSION_DENIED ? 'Vous avez refusé l’accès à votre position.' : 'Votre position est indisponible pour le moment.',
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Amène une fiche à l'écran, la met en évidence et lui donne le focus : une
  // personne au clavier continue sa lecture à partir de la fiche.
  const allerAFiche = useCallback((id: string) => {
    const fiche = document.getElementById(id)
    if (!fiche) return
    fiche.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'center' })
    fiche.focus({ preventScroll: true })
    // On garde history.state : le routeur d'Astro peut y ranger ses données.
    window.history.replaceState(window.history.state, '', `#${id}`)
    setSurlignee(id)
    clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => setSurlignee(null), SURLIGNAGE_MS)
  }, [])

  // Ancre à l'arrivée (/horaires/#droit) : même mise en évidence, une fois
  // l'îlot hydraté.
  useEffect(() => {
    const id = idDeLAncre()
    if (id && lieux.some((l) => l.id === id)) allerAFiche(id)
  }, [lieux, allerAFiche])

  // Une suggestion choisie : on retire les filtres (le lieu pourrait en être
  // exclu), puis on amène la fiche à l'écran une fois la liste mise à jour.
  function choisirLieu(lieu: Lieu) {
    setFiltre('all')
    setOuvertsSeulement(false)
    setTimeout(() => allerAFiche(lieu.id), 0)
  }

  const voirSurCarte = useCallback((id: string) => {
    sectionCarteRef.current?.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'center' })
    // Un nouvel objet à chaque clic : un second clic sur la même fiche recentre la carte.
    setCibleCarte({ id })
  }, [])

  // Les autres services (Référence…) suivent la bibliothèque : fermée, ils
  // le sont aussi, et « Référence : fermé » sous « Fermé » ne dirait rien de
  // plus. On ne les montre que si le lieu est ouvert.
  const extraDe = (lieu: Lieu) => (maintenant && horaires && lieu.codeBib && estOuvert(statutDu(lieu)) ? autresServicesDuJour(lieu, horaires, maintenant) : null)

  const propsHoraires = {
    horaires,
    dates,
    aujourdhui: maintenant?.date,
    erreur,
    decalage,
    changerDecalage,
    semaineChargee,
    plateforme,
    voirSurCarte,
  }

  // Recherche et filtres : au-dessus de la carte sur mobile, où l'on cherche
  // souvent un lieu précis sans la regarder ; sous la carte sur grand écran
  // (carte, filtres, recherche). Les deux versions sont rendues et basculées
  // en CSS (pas de saut à l'hydratation) ; la version masquée, en
  // display: none, sort de l'arbre d'accessibilité.
  const outils = (variante: string) => (
    <div role="search" class="ch-outils surface-claire">
      <button type="button" class="ch-bouton-plein" onClick={localiser} disabled={localisation.occupe}>
        <CrosshairIcon size={24} aria-hidden="true" />
        {position ? 'Mettre à jour ma position' : 'Me localiser'}
      </button>
      {/* Info-bulle native (popover) : ouverte au clic ou au clavier, fermée
          par Échap ou un clic ailleurs ; elle reste affichée tant qu'on ne
          la ferme pas (WCAG 1.4.13) */}
      <button type="button" class="ch-info" popoverTarget={`ch-confidentialite-${variante}`} aria-label="Confidentialité de votre position">
        <InfoIcon size={22} aria-hidden="true" />
      </button>
      <p id={`ch-confidentialite-${variante}`} popover="auto" class="ch-confidentialite">
        Votre position sert uniquement à calculer les distances dans votre navigateur. Elle n’est ni enregistrée ni transmise.
      </p>
      <RechercheLieu lieux={lieux} requete={requete} changerRequete={setRequete} choisir={choisirLieu} />
      <p role="status" class="ch-message">
        {localisation.message}
      </p>
    </div>
  )

  const filtresLieux = (
    <div role="group" aria-label="Filtrer les lieux" class="ch-filtres">
      {/* Se combine avec les filtres de type de lieu. */}
      <button type="button" class="ch-puce ch-puce-ouvert" disabled={!statutsPrets} aria-pressed={ouvertsSeulement} onClick={() => setOuvertsSeulement(!ouvertsSeulement)}>
        <ClockIcon size={18} aria-hidden="true" />
        Ouvert maintenant
      </button>
      <span class="ch-separateur" aria-hidden="true" />
      {FILTRES.map(([cle, libelle, couleur]) => (
        <button type="button" key={cle} class="ch-puce" aria-pressed={cle === filtre} onClick={() => setFiltre(cle)}>
          {couleur && <Pastille couleur={couleur} />}
          {cle === 'all' ? `${libelle} (${physiques.length})` : libelle}
        </button>
      ))}
    </div>
  )

  return (
    <div class="ch conteneur">
      <p role="status" class="visuellement-masque">
        {annonce}
      </p>
      {/* État d'erreur commun (etat-erreur.css) : même message et même
          « Réessayer » que les événements, les formations et les horaires du
          jour. Pas de région live : l'annonce ci-dessus le dit déjà. */}
      <div ref={erreurRef} tabIndex={-1} data-focus-programme="" class="ch-erreur">
        {erreur && (
          <div class="etat-erreur">
            <p>{MESSAGE_ERREUR}</p>
            <button type="button" class="etat-erreur-bouton" onClick={relancer}>
              <ArrowClockwiseIcon size={18} aria-hidden="true" focusable="false" />
              Réessayer
            </button>
          </div>
        )}
      </div>

      {/* Pas de titre de section : celui de la bannière suffit. */}
      <section aria-label="Liste des lieux">
        <div class="ch-avant-carte">
          {outils('etroit')}
          {filtresLieux}
        </div>

        <div ref={sectionCarteRef} id="carte" class="ch-zone-carte">
          <CarteLeaflet lieux={surCarte} idsVisibles={idsVisibles} filtre={filtre} position={position} cible={cibleCarte} choisir={allerAFiche} />
          {position && (
            <p class="ch-legende-position">
              <Pastille couleur="rouge-orange" />
              Votre position
            </p>
          )}
        </div>

        <div class="ch-apres-carte">
          {filtresLieux}
          {outils('large')}
        </div>

        {/* Les plus proches : juste avant la liste, sous « Me localiser » sur
            grand écran. */}
        {plusProches.length > 0 && (
          <section aria-labelledby="plus-proches-titre" class="ch-section">
            <h2 id="plus-proches-titre" class="ch-titre-section">
              Les plus proches de vous
            </h2>
            {plusProcheOuvert && (
              <p class="ch-plus-proche-ouvert">
                Aucun de ces lieux n’est ouvert en ce moment. Le lieu ouvert le plus proche est{' '}
                <a
                  class="ch-lien ch-gras"
                  href={`#${plusProcheOuvert.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    allerAFiche(plusProcheOuvert.id)
                  }}
                >
                  {plusProcheOuvert.name}
                </a>
                , à {formaterDistance(distances[plusProcheOuvert.id])}.
              </p>
            )}
            {/* Version compacte : id préfixé et titres un niveau plus bas. */}
            <div class="ch-grille ch-grille-3">
              {plusProches.map((lieu) => (
                <FicheLieu
                  key={lieu.id}
                  lieu={lieu}
                  image={lieu.codeBib ? images[lieu.codeBib] : undefined}
                  prefixeId="proche-"
                  niveauTitre={3}
                  compact
                  statut={statutDu(lieu)}
                  distance={distances[lieu.id]}
                  plateforme={plateforme}
                  voirFiche={allerAFiche}
                />
              ))}
            </div>
          </section>
        )}

        <p role="status" class="ch-compte">
          {liste.length === 0
            ? q
              ? `Aucun lieu ne correspond à « ${requete.trim()} ».`
              : 'Aucun lieu ne correspond à ces filtres.'
            : `${liste.length} ${liste.length > 1 ? 'lieux affichés' : 'lieu affiché'}`}
        </p>
        <div class="ch-grille ch-grille-2">
          {liste.map((lieu) => (
            <FicheLieu
              key={lieu.id}
              lieu={lieu}
              image={lieu.codeBib ? images[lieu.codeBib] : undefined}
              statut={statutDu(lieu)}
              extra={extraDe(lieu)}
              distance={distances[lieu.id]}
              surlignee={surlignee === lieu.id}
              {...propsHoraires}
            />
          ))}
        </div>
        {/* Au fond de la liste, rien ne ramenait à la carte. Simple ancre :
            elle fonctionne aussi sans JavaScript. */}
        <p class="ch-retour-carte">
          <a class="ch-lien ch-lien-icone" href="#carte">
            <ArrowUpIcon size={18} aria-hidden="true" />
            Retour à la carte
          </a>
        </p>
      </section>

      {autresServices.length > 0 && (
        <section aria-labelledby="autre-service-titre" class="ch-section ch-section-apres">
          <h2 id="autre-service-titre" class="ch-titre-section">
            Autre service
          </h2>
          <div class="ch-grille ch-grille-2">
            {autresServices.map((lieu) => (
              <FicheLieu key={lieu.id} lieu={lieu} niveauTitre={3} statut={statutDu(lieu)} extra={extraDe(lieu)} surlignee={surlignee === lieu.id} {...propsHoraires} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
