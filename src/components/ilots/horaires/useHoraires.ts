import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ajouterJours, analyserHoraires, debutTranche, dernierJourPublie, joursTranche, lireReponse, lundiDe, trancheDuJour, urlHoraires, type ReponseApi } from '@/data/horaires/horaires'

// Les horaires se chargent par tranches, à partir du lundi de la semaine
// courante, jusqu'à la dernière date que publie l'API (fin de l'année
// universitaire). La première tranche (deux semaines) suffit au statut
// « ouvert / fermé » (y compris « ouvre lundi » un dimanche soir) ; les
// suivantes ne partent que si quelqu'un navigue vers une semaine plus
// lointaine. Découpage : debutTranche et joursTranche (data/horaires).

// Semaines navigables tant qu'on n'a rien chargé au-delà de la première
// tranche : la navigation → est active dès le départ.
const SEMAINES_MIN = 8
// À partir de la 8e semaine, on charge un bloc d'avance : la semaine suivante
// est déjà là quand on clique sur →.
const DECALAGE_PRECHARGEMENT = 7

// Une API qui ne répond pas laissait « Chargement… » pour toujours : au-delà
// de ce délai, la requête échoue et « Réessayer » s'affiche
const DELAI_MS = 10_000

async function charger(url: string): Promise<ReponseApi> {
  const reponse = await fetch(url, { signal: AbortSignal.timeout?.(DELAI_MS) })
  if (!reponse.ok) throw new Error(`API horaires : HTTP ${reponse.status}`)
  // Réponse d'une autre forme : refusée ici, où l'échec mène à « Réessayer »,
  // plutôt qu'au rendu, où il faisait planter l'îlot
  return lireReponse(await reponse.json())
}

// `aujourdhui` vaut null au rendu serveur et au premier rendu client : la
// requête ne part qu'une fois la date de Montréal connue dans le navigateur.
export default function useHoraires(aujourdhui: string | null) {
  const lundi = aujourdhui ? lundiDe(aujourdhui) : null
  const [tranches, setTranches] = useState<ReponseApi[]>([])
  const [voulues, setVoulues] = useState(1)
  const [erreur, setErreur] = useState<Error | null>(null)
  const enCours = useRef(new Set<number>())

  // Page restée ouverte jusqu'au lundi : les tranches sont numérotées depuis
  // l'ancien lundi, on repart de zéro (sinon la semaine suivante paraît
  // chargée et s'affiche « Fermé »).
  const [lundiCharge, setLundiCharge] = useState(lundi)
  if (lundi !== lundiCharge) {
    setLundiCharge(lundi)
    setTranches([])
    setVoulues(1)
  }
  // Lundi des requêtes en cours ; mis à jour dans l'effet, pas au rendu
  const lundiEnCours = useRef(lundi)

  // Seules les tranches contiguës depuis la première comptent : une tranche
  // arrivée avant la précédente attend celle-ci.
  const contigues = useMemo(() => {
    const liste: ReponseApi[] = []
    for (const t of tranches) {
      if (!t) break
      liste.push(t)
    }
    return liste
  }, [tranches])

  // Dernier jour publié par l'API, une fois atteint (null avant)
  const fin = useMemo(() => (lundi ? dernierJourPublie(lundi, contigues) : null), [lundi, contigues])

  useEffect(() => {
    // Après un échec, rien ne repart avant « Réessayer » (reessayer remet
    // l'erreur à null, ce qui relance l'effet pour les tranches manquantes).
    if (!lundi || erreur) return
    if (lundiEnCours.current !== lundi) {
      lundiEnCours.current = lundi
      enCours.current.clear()
    }
    // Fin des données atteinte : rien au-delà de la tranche qui la contient
    const limite = fin ? Math.min(voulues, contigues.length) : voulues
    for (let i = 0; i < limite; i++) {
      if (tranches[i] || enCours.current.has(i)) continue
      enCours.current.add(i)
      charger(urlHoraires(ajouterJours(lundi, debutTranche(i)), joursTranche(i)))
        .then((donnees) => {
          // Réponse partie avant le changement de lundi : elle n'a plus sa place
          if (lundiEnCours.current !== lundi) return
          setTranches((avant) => {
            const apres = [...avant]
            apres[i] = donnees
            return apres
          })
        })
        .catch((e) => lundiEnCours.current === lundi && setErreur(e))
        .finally(() => lundiEnCours.current === lundi && enCours.current.delete(i))
    }
  }, [lundi, voulues, tranches, erreur, fin, contigues.length])

  const horaires = useMemo(() => {
    if (!contigues.length) return null
    return analyserHoraires({ evenements: contigues.flatMap((t) => t.evenements ?? []), labels: contigues[0].labels })
  }, [contigues])

  const joursCharges = debutTranche(contigues.length)

  // Semaines navigables, chargées ou non. Fin connue : jusqu'au dimanche de
  // la semaine du dernier jour publié. Sinon : huit semaines au départ, puis
  // une semaine de plus que ce qui est chargé, pour que → reste actif (le
  // squelette s'affiche le temps du chargement).
  const dates = useMemo(() => {
    if (!lundi) return []
    let jours: number
    if (fin) {
      const dernier = Math.round((Date.parse(fin) - Date.parse(lundi)) / 86_400_000)
      jours = Math.max(Math.ceil((dernier + 1) / 7) * 7, 7)
    } else {
      jours = Math.max(SEMAINES_MIN * 7, joursCharges + 7)
    }
    return Array.from({ length: jours }, (_, i) => ajouterJours(lundi, i))
  }, [lundi, fin, joursCharges])

  /** Demande la tranche qui contient la semaine `decalage` (0 = semaine courante), et la suivante à partir de la 8e semaine */
  const assurerSemaine = useCallback((decalage: number) => {
    const tranche = trancheDuJour(decalage * 7 + 6)
    const besoin = tranche + (decalage >= DECALAGE_PRECHARGEMENT ? 2 : 1)
    setVoulues((v) => Math.max(v, besoin))
  }, [])

  // Fin connue : toutes les tranches jusqu'à elle sont chargées
  const semaineChargee = useCallback((decalage: number) => Boolean(fin) || (decalage + 1) * 7 <= joursCharges, [fin, joursCharges])

  const reessayer = useCallback(() => setErreur(null), [])

  return { horaires, dates, dernierJour: fin, erreur, assurerSemaine, semaineChargee, reessayer }
}
