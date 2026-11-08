/*
 * Logique des horaires : fonctions pures, sans React (horaires.js de
 * src/components/CarteHoraires dans coquille-web). Partagée par l'îlot de
 * /horaires/ et le bloc « Aujourd'hui » des fiches.
 *
 * Les dates sont des chaînes « AAAA-MM-JJ » et les heures des minutes depuis
 * minuit, dans le fuseau de Montréal. On évite les objets Date locaux :
 * l'heure du navigateur n'est pas forcément celle de Montréal, et
 * `toISOString()` (UTC) décale la date d'un jour chaque soir.
 */
import type { Lieu } from './lieux'
import { sansAccents } from '../../lib/texte.mjs'
import { lienTelephone } from '../../lib/telephone.mjs'

const HORAIRES_API = 'https://api.bib.umontreal.ca/horaires'

const FUSEAU = 'America/Montreal'
const FERME_BIENTOT_MIN = 30
const JOUR = 24 * 60

/** [début, fin] en minutes ; une fin au-delà de 24 h passe minuit */
export type Plage = [number, number]

export interface Horaires {
  /** code de bibliothèque → service → date → plages */
  parBib: Record<string, Record<string, Record<string, Plage[]>>>
  libellesServices: Record<string, string>
}

export interface Maintenant {
  date: string
  minutes: number
}

export type Etat = 'open' | 'closing-soon' | 'closed' | 'unknown'
export interface Statut {
  etat: Etat
  texte: string
}

interface EvenementApi {
  date: string
  bibliotheque: string
  service: string
  debut1?: string
  fin1?: string
  debut2?: string
  fin2?: string
}

export interface ReponseApi {
  evenements?: EvenementApi[]
  labels?: { services?: Record<string, string> }
}

const formateurMontreal = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Date et heure courantes à Montréal, quel que soit le fuseau du navigateur */
export function maintenantMontreal(date = new Date()): Maintenant {
  const p = Object.fromEntries(formateurMontreal.formatToParts(date).map(({ type, value }) => [type, value]))
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

// Les calculs de jours passent par UTC, où il n'y a pas de changement
// d'heure : ajouter 24 h tombe toujours sur le jour suivant.
function enDateUtc(date: string) {
  const [a, m, j] = date.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j))
}

export function ajouterJours(date: string, jours: number) {
  const d = enDateUtc(date)
  d.setUTCDate(d.getUTCDate() + jours)
  return d.toISOString().slice(0, 10)
}

export function lundiDe(date: string) {
  const jour = enDateUtc(date).getUTCDay() // 0 = dimanche
  return ajouterJours(date, jour === 0 ? -6 : 1 - jour)
}

export function formaterDate(date: string, options: Intl.DateTimeFormatOptions) {
  return enDateUtc(date).toLocaleDateString('fr-CA', { ...options, timeZone: 'UTC' })
}

/** Format québécois : « 9 h », « 21 h 30 », et « minuit » plutôt que « 0 h » ou « 24 h » */
function formaterHeure(minutes: number) {
  const t = minutes % JOUR
  if (t === 0) return 'minuit'
  const h = Math.floor(t / 60)
  const m = t % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export function formaterPlages(plages: Plage[] | undefined) {
  if (!plages || plages.length === 0) return 'Fermé'
  if (plages.length === 1 && plages[0][0] === 0 && plages[0][1] >= JOUR) return 'Ouvert 24 h sur 24'
  return plages.map(([debut, fin]) => `${formaterHeure(debut)} à ${formaterHeure(fin)}`).join(', ')
}

function enMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Une fin qui ne vient pas après le début passe minuit : l'API écrit
// « 07:00 → 00:00 » pour une fermeture à minuit (et « 00:00 → 24:00 » pour
// une journée complète). On la compte donc sur le jour suivant (+ 24 h).
function plage(debut: string, fin: string): Plage {
  const a = enMinutes(debut)
  const b = enMinutes(fin)
  return [a, b <= a ? b + JOUR : b]
}

// Les quatre champs de l'API ne sont pas deux plages indépendantes :
// debut1 → [pause : fin1 → debut2] → fin2. Une plage continue n'a que
// debut1 et fin2, fin1 et debut2 restant vides.
function plagesDe(evt: EvenementApi): Plage[] {
  if (!evt.debut1 || !evt.fin2) return []
  if (evt.fin1 && evt.debut2) return [plage(evt.debut1, evt.fin1), plage(evt.debut2, evt.fin2)]
  return [plage(evt.debut1, evt.fin2)]
}

// Heure de fermeture réelle d'une plage qui finit à minuit : si le jour
// suivant commence à minuit (période d'examens ouverte 24 h sur 24), le lieu
// ne ferme pas, on suit la plage jusqu'à sa vraie fin. `inconnue` si
// l'ouverture se poursuit au-delà des jours chargés.
function fermetureReelle(parDate: Record<string, Plage[]>, date: string, fin: number) {
  let jour = date
  let fermeture = fin
  let jours = 0
  while (fermeture >= JOUR) {
    const suivant = ajouterJours(jour, 1)
    if (parDate[suivant] === undefined) return { inconnue: true as const }
    const premiere = parDate[suivant][0]
    if (!premiere || premiere[0] !== 0) break
    jour = suivant
    fermeture = premiere[1]
    jours++
  }
  return { inconnue: false as const, date: jour, jours, minutes: fermeture }
}

/** URL d'une tranche de l'API. Le filtre `bib` (et la route /horaires/<code>) répond 422 : on prend tout le réseau. */
export function urlHoraires(debut: string, jours: number) {
  return `${HORAIRES_API}?debut=${debut}&fin=P${jours}D&format=json`
}

/** Regroupe les événements de l'API par bibliothèque, puis par service, puis par date */
export function analyserHoraires(donnees: ReponseApi): Horaires {
  const parBib: Horaires['parBib'] = {}
  for (const evt of donnees?.evenements ?? []) {
    // L'API encode minuit heure locale : le préfixe est déjà la bonne date.
    const date = evt.date.slice(0, 10)
    parBib[evt.bibliotheque] ??= {}
    parBib[evt.bibliotheque][evt.service] ??= {}
    parBib[evt.bibliotheque][evt.service][date] = plagesDe(evt)
  }
  return { parBib, libellesServices: donnees?.labels?.services ?? {} }
}

/** Services d'une bibliothèque, l'ouverture du bâtiment (« regulier ») d'abord */
export function servicesDe(horaires: Horaires, code: string) {
  return Object.keys(horaires.parBib[code] ?? {}).sort((a, b) => (a === 'regulier' ? -1 : b === 'regulier' ? 1 : 0))
}

export const libelleService = (horaires: Horaires, cle: string) => horaires.libellesServices[cle] ?? cle

/**
 * Statut principal d'un lieu, d'après l'horaire « regulier ». `dates` est la
 * liste ordonnée des jours couverts par les requêtes.
 */
export function statutDe(lieu: Lieu, horaires: Horaires | null, maintenant: Maintenant, dates: string[]): Statut {
  // Brossard, Jardin botanique et Place Dupuis ne sont pas dans l'API : on le
  // dit plutôt que d'afficher un « Fermé » qu'on ne peut pas vérifier.
  if (!lieu.codeBib) return { etat: 'unknown', texte: 'Horaire non publié en ligne, vérifiez sur place' }
  if (!horaires) return { etat: 'unknown', texte: 'Horaire indisponible pour le moment' }

  const parDate = horaires.parBib[lieu.codeBib]?.regulier ?? {}
  const aujourdhui = parDate[maintenant.date] ?? []

  for (const [debut, fin] of aujourdhui) {
    if (maintenant.minutes >= debut && maintenant.minutes < fin) {
      const f = fermetureReelle(parDate, maintenant.date, fin)
      // Fermeture au-delà des jours chargés (deux pour le bandeau) : on ne
      // sait pas quand, « 24 h sur 24 » promettrait trop
      if (f.inconnue) return { etat: 'open', texte: 'Ouvert sans interruption' }
      if (f.jours * JOUR + f.minutes - maintenant.minutes <= FERME_BIENTOT_MIN) {
        return { etat: 'closing-soon', texte: `Ferme bientôt, à ${formaterHeure(f.minutes)}` }
      }
      // Fermeture un autre jour : « jusqu'à demain à 23 h », « jusqu'à
      // dimanche à minuit », et la date au-delà d'une semaine, où le jour seul
      // serait ambigu.
      const heure = formaterHeure(f.minutes)
      if (f.jours === 0) return { etat: 'open', texte: `Ouvert jusqu'à ${heure}` }
      if (f.jours === 1) return { etat: 'open', texte: `Ouvert jusqu'à demain à ${heure}` }
      if (f.jours <= 6) return { etat: 'open', texte: `Ouvert jusqu'à ${formaterDate(f.date, { weekday: 'long' })} à ${heure}` }
      return { etat: 'open', texte: `Ouvert jusqu'au ${formaterDate(f.date, { weekday: 'long', day: 'numeric', month: 'long' })} à ${heure}` }
    }
  }
  for (const [debut] of aujourdhui) {
    if (maintenant.minutes < debut) return { etat: 'closed', texte: `Fermé, ouvre à ${formaterHeure(debut)}` }
  }

  const aVenir = dates.filter((d) => d > maintenant.date)
  for (let i = 0; i < aVenir.length; i++) {
    const plages = parDate[aVenir[i]] ?? []
    if (plages.length) {
      const jour = i === 0 ? 'demain' : formaterDate(aVenir[i], { weekday: 'long' })
      return { etat: 'closed', texte: `Fermé, ouvre ${jour} à ${formaterHeure(plages[0][0])}` }
    }
  }
  return { etat: 'closed', texte: 'Fermé' }
}

/** Services secondaires du jour (référence, soutien informatique…), affichés sous le statut */
export function autresServicesDuJour(lieu: Lieu, horaires: Horaires, maintenant: Maintenant) {
  const services = horaires.parBib[lieu.codeBib ?? ''] ?? {}
  return Object.keys(services)
    .filter((cle) => cle !== 'regulier')
    .map((cle) => {
      const plages = services[cle][maintenant.date] ?? []
      const enCours = plages.find(([debut, fin]) => maintenant.minutes >= debut && maintenant.minutes < fin)
      return `${libelleService(horaires, cle)} : ${enCours ? `jusqu'à ${formaterHeure(enCours[1])}` : 'fermé'}`
    })
}

/** Distance à vol d'oiseau, en kilomètres */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formaterDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

export function normaliser(texte: string) {
  return sansAccents(texte).toLowerCase()
}

// Texte dans lequel la recherche fouille : nom, adresse, pavillon, alias
// (BLSH, « sciences »…), espaces et types de salles. On trouve ainsi une
// bibliothèque par « studio vidéo » ou « cabine ».
function texteRecherche(lieu: Lieu) {
  return normaliser(
    [lieu.name, lieu.addr, lieu.pavillon, ...(lieu.aliases ?? []), ...(lieu.spaces ?? []).map((s) => s.label), ...(lieu.reservations ?? []).map((r) => r.label)]
      .filter(Boolean)
      .join(' | ')
  )
}

/** `requete` est déjà normalisée (sans accents, en minuscules) */
export const correspond = (lieu: Lieu, requete: string) => !requete || texteRecherche(lieu).includes(requete)

// « Studios et ateliers » chevauche « Bibliothèques » : on le déduit des
// espaces plutôt que d'une liste à maintenir à part.
export const aStudio = (lieu: Lieu) => Boolean(lieu.spaces?.some(({ label }) => /atelier|studio/i.test(label)))

export function dansFiltre(lieu: Lieu, filtre: string) {
  if (filtre === 'all') return true
  if (filtre === 'studios') return aStudio(lieu)
  return lieu.zone === filtre
}

/** Lien tel: d'un numéro (lib/telephone), ou null s'il n'en contient pas */
export function lienTel(telephone: string) {
  return lienTelephone(telephone) ?? null
}

/** Ouvre l'application de cartes de l'appareil ; le rendu serveur produit le lien Google */
export function lienItineraire(lieu: Lieu, plateforme: string | null) {
  const { lat, lng, name } = lieu
  if (plateforme === 'ios') return `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
  if (plateforme === 'android') return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
