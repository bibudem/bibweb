import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ajouterJours, analyserHoraires, lundiDe, urlHoraires, type ReponseApi } from '@/data/horaires/horaires'

// Les horaires se chargent par tranches de deux semaines, à partir du lundi
// de la semaine courante. La première tranche suffit au statut « ouvert /
// fermé » (y compris « ouvre lundi » un dimanche soir) ; les suivantes ne
// partent que si quelqu'un navigue vers une semaine plus lointaine. Deux
// semaines pèsent ~95 Ko, contre ~410 Ko pour deux mois d'un coup : l'API ne
// compresse pas ses réponses.
const JOURS_PAR_TRANCHE = 14
const SEMAINES = 8
const TRANCHES_MAX = Math.ceil((SEMAINES * 7) / JOURS_PAR_TRANCHE)

async function charger(url: string): Promise<ReponseApi> {
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`API horaires : HTTP ${reponse.status}`)
  return reponse.json()
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

  useEffect(() => {
    // Après un échec, rien ne repart avant « Réessayer » (reessayer remet
    // l'erreur à null, ce qui relance l'effet pour les tranches manquantes).
    if (!lundi || erreur) return
    if (lundiEnCours.current !== lundi) {
      lundiEnCours.current = lundi
      enCours.current.clear()
    }
    for (let i = 0; i < voulues; i++) {
      if (tranches[i] || enCours.current.has(i)) continue
      enCours.current.add(i)
      charger(urlHoraires(ajouterJours(lundi, i * JOURS_PAR_TRANCHE), JOURS_PAR_TRANCHE))
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
  }, [lundi, voulues, tranches, erreur])

  // Toutes les semaines navigables, chargées ou non : la navigation ← → en
  // connaît ainsi la limite dès le départ.
  const dates = useMemo(() => (lundi ? Array.from({ length: SEMAINES * 7 }, (_, i) => ajouterJours(lundi, i)) : []), [lundi])

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

  const horaires = useMemo(() => {
    if (!contigues.length) return null
    return analyserHoraires({ evenements: contigues.flatMap((t) => t.evenements ?? []), labels: contigues[0].labels })
  }, [contigues])

  const joursCharges = contigues.length * JOURS_PAR_TRANCHE

  /** Demande la tranche qui contient la semaine `decalage` (0 = semaine courante) */
  const assurerSemaine = useCallback((decalage: number) => {
    const besoin = Math.min(Math.ceil(((decalage + 1) * 7) / JOURS_PAR_TRANCHE), TRANCHES_MAX)
    setVoulues((v) => Math.max(v, besoin))
  }, [])

  const semaineChargee = useCallback((decalage: number) => (decalage + 1) * 7 <= joursCharges, [joursCharges])

  const reessayer = useCallback(() => setErreur(null), [])

  return { horaires, dates, erreur, assurerSemaine, semaineChargee, reessayer }
}
