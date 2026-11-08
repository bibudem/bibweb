import { useEffect, useMemo, useState } from 'preact/hooks'
import { CAPTEURS, urlOccupation } from '@/data/horaires/occupation'

/** Rafraîchissement : le compteur bouge lentement, une minute suffit */
const INTERVALLE_MS = 60 * 1000

/**
 * Taux d'occupation (en %) des lieux ouverts qui ont un compteur, relus
 * chaque minute tant que la page est visible (en arrière-plan, on n'appelle
 * pas le relais ; au retour, on relit tout de suite).
 *
 * Un lieu sans réponse (relais en panne, compteur muet) n'a simplement pas
 * d'entrée : la fiche n'affiche alors pas d'encadré plutôt qu'un chiffre
 * faux.
 */
export default function useOccupation(idsOuverts: string[]) {
  const [taux, setTaux] = useState<Record<string, number>>({})
  // Clé stable : l'effet ne repart que si l'ensemble des lieux ouverts change
  const cle = useMemo(() => idsOuverts.filter((id) => id in CAPTEURS).sort().join(','), [idsOuverts])

  useEffect(() => {
    const ids = cle ? cle.split(',') : []
    if (!ids.length) {
      setTaux({})
      return
    }
    let annule = false
    let minuterie: ReturnType<typeof setTimeout> | undefined

    async function lire(id: string): Promise<[string, number] | null> {
      try {
        const reponse = await fetch(urlOccupation(id), { cache: 'no-store' })
        if (!reponse.ok) return null
        const donnees = await reponse.json()
        const valeur = Number(donnees?.occupancyValue)
        if (!Number.isFinite(valeur) || valeur < 0) return null
        return [id, Math.round((valeur / CAPTEURS[id].capacite) * 100)]
      } catch {
        return null
      }
    }

    async function actualiser() {
      clearTimeout(minuterie)
      if (document.visibilityState === 'visible') {
        const resultats = await Promise.all(ids.map(lire))
        if (annule) return
        setTaux(Object.fromEntries(resultats.filter((r): r is [string, number] => r !== null)))
      }
      if (!annule) minuterie = setTimeout(actualiser, INTERVALLE_MS)
    }

    const auRetour = () => {
      if (document.visibilityState === 'visible') actualiser()
    }
    actualiser()
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      annule = true
      clearTimeout(minuterie)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [cle])

  return taux
}
