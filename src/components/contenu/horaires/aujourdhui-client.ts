/*
 * Remplit les blocs « Aujourd'hui » de la page à partir de l'API horaires.
 * Une seule requête pour tout le réseau : le filtre par bibliothèque de
 * l'API répond 422 (voir horaires.ts). En cas d'échec, chaque bloc montre
 * l'état d'erreur commun (EtatErreur) ; « Réessayer » relance la requête
 * pour toute la page.
 */
import { analyserHoraires, formaterPlages, libelleService, maintenantMontreal, servicesDe, urlHoraires } from '@/data/horaires/horaires'

let brancher = true

export async function remplirHorairesAujourdhui() {
  const blocs = [...document.querySelectorAll<HTMLElement>('[data-horaire-aujourdhui]')]
  if (!blocs.length) return

  if (brancher) {
    brancher = false
    for (const bloc of blocs) {
      bloc.querySelector('[data-reessayer]')?.addEventListener('click', () => {
        // Le bouton disparaît pendant la requête : le focus passe au bloc
        bloc.tabIndex = -1
        bloc.dataset.focusProgramme = ''
        bloc.focus()
        remplirHorairesAujourdhui()
      })
    }
  }

  for (const bloc of blocs) {
    bloc.querySelector<HTMLElement>('.etat-erreur')!.hidden = true
    bloc.querySelector('dl')!.setAttribute('aria-busy', 'true')
  }

  const { date } = maintenantMontreal()
  let horaires
  try {
    const reponse = await fetch(urlHoraires(date, 1))
    if (!reponse.ok) throw new Error(`API horaires : HTTP ${reponse.status}`)
    horaires = analyserHoraires(await reponse.json())
  } catch (erreur) {
    console.error('Horaires du jour :', erreur)
    horaires = null
  }

  for (const bloc of blocs) {
    const liste = bloc.querySelector('dl')!
    const etat = bloc.querySelector<HTMLElement>('.etat')!
    const erreur = bloc.querySelector<HTMLElement>('.etat-erreur')!
    const modele = bloc.querySelector('template')!
    const code = bloc.dataset.horaireAujourdhui ?? ''
    liste.replaceChildren()
    liste.setAttribute('aria-busy', 'false')
    etat.hidden = true

    if (!horaires) {
      erreur.hidden = false
      continue
    }
    const services = servicesDe(horaires, code)
    if (!services.length) {
      etat.textContent = 'Aucun horaire publié pour aujourd’hui.'
      etat.hidden = false
      continue
    }
    for (const cle of services) {
      const entree = modele.content.firstElementChild!.cloneNode(true) as HTMLElement
      entree.querySelector('dt span')!.textContent = libelleService(horaires, cle)
      entree.querySelector('dd')!.textContent = formaterPlages(horaires.parBib[code][cle][date])
      liste.append(entree)
    }
  }
}
