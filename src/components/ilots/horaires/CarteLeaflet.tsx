import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import 'leaflet/dist/leaflet.css'
import type { CircleMarker, Map as CarteL } from 'leaflet'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { aStudio, haversine } from '@/data/horaires/horaires'
import type { Lieu } from '@/data/horaires/lieux'

// Cadrage automatique, pour ne pas imposer un dézoom :
// - « Tous les lieux » : Montréal et Laval seulement (île de Montréal et île
//   Jésus) ; Brossard et Saint-Hyacinthe restent hors de la vue ;
// - autre filtre : 30 km autour de la BLSH ; Brossard (Points de service)
//   entre dans la vue, Saint-Hyacinthe (Bibliothèques) non.
// Les lieux hors de la vue gardent marqueur et fiche, et un encadré sur la
// carte les nomme et y mène. S'il ne reste qu'eux, le cadrage les prend.
const ZONE_MTL_LAVAL = { sud: 45.46, nord: 45.62, ouest: -73.78, est: -73.5 }
const REPERE_MTL = { lat: 45.5045407, lng: -73.6138466 } // BLSH
const CADRAGE_MAX_KM = 30
const RAYON = 8

const dansCadrage = (l: { lat: number; lng: number }, tous: boolean) =>
  tous
    ? l.lat >= ZONE_MTL_LAVAL.sud && l.lat <= ZONE_MTL_LAVAL.nord && l.lng >= ZONE_MTL_LAVAL.ouest && l.lng <= ZONE_MTL_LAVAL.est
    : haversine(REPERE_MTL.lat, REPERE_MTL.lng, l.lat, l.lng) <= CADRAGE_MAX_KM

type Groupe = { cle: string; pavillon?: string; lat: number; lng: number; lieux: Lieu[] }

// Les lieux d'un même pavillon (la BLSH et les Livres rares, au pavillon
// Samuel-Bronfman) partagent un seul marqueur, dont la bulle les liste tous :
// deux marqueurs presque superposés seraient impossibles à distinguer.
function grouperParPavillon(lieux: Lieu[]): Groupe[] {
  const groupes = new Map<string, Groupe>()
  for (const lieu of lieux) {
    const cle = lieu.pavillon ?? lieu.id
    if (!groupes.has(cle)) groupes.set(cle, { cle, pavillon: lieu.pavillon, lat: lieu.lat!, lng: lieu.lng!, lieux: [] })
    groupes.get(cle)!.lieux.push(lieu)
  }
  return [...groupes.values()]
}

function cadrer(carte: CarteL, groupes: Groupe[], extra: [number, number][] = [], tous = true) {
  const proches = groupes.filter((g) => dansCadrage(g, tous))
  const points = (proches.length ? proches : groupes).map((g) => [g.lat, g.lng] as [number, number]).concat(extra)
  if (points.length) carte.fitBounds(points, { padding: [24, 24], maxZoom: 16 })
}

// Couleurs des jetons, lues au moment de dessiner : Leaflet veut des valeurs,
// pas des var().
const jeton = (nom: string) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim()

interface Props {
  lieux: Lieu[]
  idsVisibles: Set<string>
  filtre: string
  position: { lat: number; lng: number } | null
  cible: { id: string } | null
  choisir: (id: string) => void
}

// Leaflet touche à `window` dès son import : on le charge dans un effet, et
// seulement quand la carte approche de l'écran (Leaflet et les tuiles ne
// sont pas téléchargés sinon). Les marqueurs sont des cercles vectoriels,
// rendus focalisables : Entrée ou Espace ouvre la bulle, Échap la referme.
export default function CarteLeaflet({ lieux, idsVisibles, filtre, position, cible, choisir }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const groupes = useMemo(() => grouperParPavillon(lieux), [lieux])
  const groupeDe = useMemo(() => Object.fromEntries(groupes.flatMap((g) => g.lieux.map((l) => [l.id, g]))), [groupes])
  const carteRef = useRef<CarteL | null>(null)
  const [prete, setPrete] = useState(false)
  const marqueursRef = useRef<Record<string, CircleMarker>>({})
  const marqueurPositionRef = useRef<CircleMarker | null>(null)
  const choisirRef = useRef(choisir)
  choisirRef.current = choisir
  const filtreRef = useRef(filtre)
  filtreRef.current = filtre
  const idsVisiblesRef = useRef(idsVisibles)
  idsVisiblesRef.current = idsVisibles

  // On n'observe la carte qu'une fois la page chargée : avant l'arrivée des
  // images et des polices, la page est plus courte et la carte passerait un
  // instant dans la zone visible. Une seconde au plus, toutefois : les
  // scripts de mesure (Clarity, Analytics, Corvée) retardent l'événement
  // load de plusieurs secondes, et la carte restait vide s'ils traînaient.
  useEffect(() => {
    let observateur: IntersectionObserver | undefined
    let delai: ReturnType<typeof setTimeout> | undefined
    const observer = () => {
      if (observateur) return
      clearTimeout(delai)
      window.removeEventListener('load', observer)
      observateur = new IntersectionObserver(
        (entrees) => {
          if (entrees.some((e) => e.isIntersecting)) {
            setVisible(true)
            observateur?.disconnect()
          }
        },
        { rootMargin: '200px' }
      )
      if (conteneurRef.current) observateur.observe(conteneurRef.current)
    }
    if (document.readyState === 'complete') observer()
    else {
      window.addEventListener('load', observer, { once: true })
      delai = setTimeout(observer, 1000)
    }
    return () => {
      clearTimeout(delai)
      window.removeEventListener('load', observer)
      observateur?.disconnect()
    }
  }, [])

  // Contour bleu foncé sur tous les marqueurs : le vert, le jaune, le violet
  // et l'orange n'atteignent pas 3:1 sur le gris des tuiles (WCAG 1.4.11).
  function couleurs(montres: Lieu[]) {
    const contour = jeton('--bleu-fonce')
    if (filtreRef.current === 'studios' && montres.some(aStudio)) return { fill: jeton('--jaune'), contour }
    const zone = montres[0]?.zone
    if (zone === 'conservation') return { fill: jeton('--vert-pale'), contour }
    if (zone === 'points-service') return { fill: jeton('--violet-fonce'), contour }
    return { fill: jeton('--bleu-principal'), contour }
  }

  const libelle = (groupe: Groupe, montres: Lieu[]) => (montres.length === 1 ? montres[0].name : `${groupe.pavillon} : ${montres.map((l) => l.name).join(', ')}`)

  // Contenu de la bulle, construit en DOM : de vrais boutons reliés au
  // gestionnaire de l'îlot. Un seul lieu : son nom et « Voir la fiche ».
  // Plusieurs : le pavillon, puis un bouton par lieu visible.
  function bulle(carte: CarteL, groupe: Groupe, montres: Lieu[]) {
    const contenu = document.createElement('div')
    const titre = document.createElement('strong')
    const bouton = (texte: string, lieu: Lieu) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'ch-bulle-lien'
      b.textContent = texte
      if (texte === 'Voir la fiche') {
        const contexte = document.createElement('span')
        contexte.className = 'visuellement-masque'
        contexte.textContent = ` – ${lieu.name}`
        b.append(contexte)
      }
      b.addEventListener('click', () => {
        carte.closePopup()
        choisirRef.current(lieu.id)
      })
      return b
    }
    if (montres.length === 1) {
      titre.textContent = montres[0].name
      contenu.append(titre, document.createElement('br'), bouton('Voir la fiche', montres[0]))
    } else {
      titre.textContent = groupe.pavillon ?? ''
      const liste = document.createElement('ul')
      liste.className = 'ch-bulle-liste'
      montres.forEach((lieu) => {
        const item = document.createElement('li')
        item.append(bouton(lieu.name, lieu))
        liste.append(item)
      })
      contenu.append(titre, liste)
    }
    return contenu
  }

  // Création de la carte, une seule fois, quand elle approche de l'écran.
  useEffect(() => {
    if (!visible) return
    let annule = false
    let carte: CarteL | undefined

    async function initialiser() {
      const { default: L } = await import('leaflet')
      if (annule || !conteneurRef.current) return

      carte = L.map(conteneurRef.current, { scrollWheelZoom: false, zoomControl: false })
      L.control.zoom({ position: 'topright', zoomInTitle: 'Zoom avant', zoomOutTitle: 'Zoom arrière' }).addTo(carte)
      carte.attributionControl.setPrefix('<a href="https://leafletjs.com" lang="en">Leaflet</a>')
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tuiles &copy; Esri',
      }).addTo(carte)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(carte)

      for (const groupe of groupes) {
        const { fill, contour } = couleurs(groupe.lieux)
        const marqueur = L.circleMarker([groupe.lat, groupe.lng], { radius: RAYON, color: contour, weight: 2, fillColor: fill, fillOpacity: 1 }).addTo(carte)
        const c = carte
        marqueur.bindPopup(() => bulle(c, groupe, groupe.lieux.filter((l) => idsVisiblesRef.current.has(l.id))))
        marqueur.on('mouseover', () => marqueur.setRadius(RAYON + 3))
        marqueur.on('mouseout', () => marqueur.setRadius(RAYON))
        marqueur.on('popupopen', (e) => {
          const el = e.popup.getElement()
          // Bouton de fermeture de Leaflet : libellé anglais et lien vers #close.
          el?.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label', 'Fermer la bulle')
          // Ouverte depuis le marqueur focalisé, la bulle reçoit le focus ; il
          // revient au marqueur à la fermeture.
          if (marqueur.getElement() === document.activeElement) el?.querySelector<HTMLElement>('.ch-bulle-lien')?.focus()
        })
        marqueur.on('popupclose', () => {
          const el = marqueur.getElement() as HTMLElement | undefined
          if (el && conteneurRef.current?.contains(document.activeElement)) el.focus({ preventScroll: true })
        })
        rendreFocalisable(marqueur, libelle(groupe, groupe.lieux))
        marqueursRef.current[groupe.cle] = marqueur
      }

      // Échap referme la bulle depuis l'un de ses boutons.
      conteneurRef.current.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') carte?.closePopup()
      })

      cadrer(carte, groupes)
      carteRef.current = carte
      setPrete(true)
      // Le conteneur peut avoir changé de taille pendant le chargement.
      setTimeout(() => !annule && carte?.invalidateSize(), 100)
    }
    initialiser()

    return () => {
      annule = true
      carte?.remove()
      carteRef.current = null
      marqueursRef.current = {}
      marqueurPositionRef.current = null
    }
    // La liste des lieux est statique : la carte n'est créée qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Filtre : affiche, masque et recolore les marqueurs, puis recadre.
  useEffect(() => {
    const carte = carteRef.current
    if (!carte) return
    const visibles: Groupe[] = []
    for (const groupe of groupes) {
      const marqueur = marqueursRef.current[groupe.cle]
      if (!marqueur) continue
      const montres = groupe.lieux.filter((l) => idsVisibles.has(l.id))
      if (montres.length && !carte.hasLayer(marqueur)) {
        marqueur.addTo(carte)
        rendreFocalisable(marqueur, libelle(groupe, montres))
      }
      if (!montres.length) {
        if (carte.hasLayer(marqueur)) carte.removeLayer(marqueur)
        continue
      }
      const { fill, contour } = couleurs(montres)
      marqueur.setStyle({ fillColor: fill, color: contour })
      // Rôle, focus et nom : à la création, la carte n'a pas encore de vue et
      // Leaflet n'a pas dessiné le cercle (getElement() vide) ; il l'est ici
      rendreFocalisable(marqueur, libelle(groupe, montres))
      visibles.push(groupe)
    }
    cadrer(carte, visibles, position ? [[position.lat, position.lng]] : [], filtre === 'all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prete, groupes, idsVisibles, filtre, position])

  // Position de la personne.
  useEffect(() => {
    const carte = carteRef.current
    if (!carte || !position) return
    import('leaflet').then(({ default: L }) => {
      marqueurPositionRef.current?.remove()
      marqueurPositionRef.current = L.circleMarker([position.lat, position.lng], {
        radius: RAYON + 1,
        color: jeton('--bleu-fonce'),
        weight: 3,
        fillColor: jeton('--rouge-orange'),
        fillOpacity: 1,
      })
        .addTo(carte)
        .bindPopup('Votre position')
    })
  }, [prete, position])

  // « Voir sur la carte » depuis une fiche.
  useEffect(() => {
    const carte = carteRef.current
    const marqueur = cible && marqueursRef.current[groupeDe[cible.id]?.cle]
    if (!carte || !marqueur) return
    carte.setView(marqueur.getLatLng(), Math.max(carte.getZoom(), 15))
    marqueur.openPopup()
  }, [prete, cible, groupeDe])

  // Lieux retenus mais hors de la vue (voir plus haut) : nommés dans un
  // encadré ; chacun y mène (la carte se recentre et ouvre sa bulle). Sans
  // lieu dans la vue, le cadrage les prend tous : pas d'encadré.
  const retenus = groupes.filter((g) => g.lieux.some((l) => idsVisibles.has(l.id)))
  const horsVueTous = retenus.filter((g) => !dansCadrage(g, filtre === 'all'))
  const horsVue = horsVueTous.length < retenus.length ? horsVueTous : []
  const allerA = (groupe: Groupe) => {
    const carte = carteRef.current
    const marqueur = marqueursRef.current[groupe.cle]
    if (!carte || !marqueur) return
    carte.setView(marqueur.getLatLng(), 13)
    marqueur.openPopup()
  }

  return (
    <div class="ch-carte-cadre">
      <div ref={conteneurRef} class="ch-carte" role="region" aria-label="Carte des bibliothèques. La liste qui suit donne les mêmes renseignements." />
      {prete && horsVue.length > 0 && (
        <div class="ch-hors-vue">
          <p id="ch-hors-vue-titre">Hors de cette vue :</p>
          <ul aria-labelledby="ch-hors-vue-titre">
            {horsVue.map((groupe) => (
              <li key={groupe.cle}>
                <button type="button" onClick={() => allerA(groupe)}>
                  <span>{groupe.lieux.map(nomAvecVille).join(', ')}</span>
                  <ArrowRightIcon size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// « Bibliothèque de médecine vétérinaire (Saint-Hyacinthe) » : la ville du
// campus, quand le nom ne la dit pas
const nomAvecVille = (lieu: Lieu) => {
  const ville = lieu.pavillon?.startsWith('Campus de ') ? lieu.pavillon.slice('Campus de '.length) : undefined
  return ville && !lieu.name.includes(ville) ? `${lieu.name} (${ville})` : lieu.name
}

// Les cercles SVG de Leaflet ne sont pas focalisables : on leur donne un rôle
// de bouton, un nom et la touche Entrée ou Espace.
function rendreFocalisable(marqueur: CircleMarker, nom: string) {
  const el = marqueur.getElement() as SVGElement | undefined
  if (!el || el.dataset.focalisable) {
    el?.setAttribute('aria-label', nom)
    return
  }
  el.dataset.focalisable = 'oui'
  el.setAttribute('tabindex', '0')
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', nom)
  el.setAttribute('aria-haspopup', 'dialog')
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    marqueur.openPopup()
  })
  el.addEventListener('focus', () => marqueur.setRadius(RAYON + 3))
  el.addEventListener('blur', () => marqueur.setRadius(RAYON))
}

