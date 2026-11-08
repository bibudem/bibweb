import type { TargetedKeyboardEvent } from 'preact'
import { useId, useState } from 'preact/hooks'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass'
import { correspond, normaliser } from '@/data/horaires/horaires'
import type { Lieu } from '@/data/horaires/lieux'

const MAX_SUGGESTIONS = 8

interface Props {
  lieux: Lieu[]
  requete: string
  changerRequete: (q: string) => void
  choisir: (lieu: Lieu) => void
}

// Champ de recherche à suggestions (l'Autocomplete freeSolo de la source),
// selon le motif Combobox de l'APG : liste de suggestions, flèches, Entrée,
// Échap. Le texte tapé filtre aussi la liste des lieux sous la carte ; les
// suggestions suivent les mêmes règles (voir correspond). Rien tant qu'on
// n'a rien tapé.
export default function RechercheLieu({ lieux, requete, changerRequete, choisir }: Props) {
  const id = useId()
  const [ouverte, setOuverte] = useState(false)
  const [active, setActive] = useState(-1)
  const q = normaliser(requete.trim())
  const suggestions = q ? lieux.filter((l) => correspond(l, q)).slice(0, MAX_SUGGESTIONS) : []
  const affichee = ouverte && suggestions.length > 0

  function valider(lieu: Lieu) {
    changerRequete(lieu.name)
    setOuverte(false)
    setActive(-1)
    choisir(lieu)
  }

  function touche(e: TargetedKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOuverte(true)
      setActive((a) => (suggestions.length ? (a + 1) % suggestions.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOuverte(true)
      setActive((a) => (suggestions.length ? (a <= 0 ? suggestions.length - 1 : a - 1) : -1))
    } else if (e.key === 'Enter') {
      if (affichee && active >= 0) {
        e.preventDefault()
        valider(suggestions[active])
      }
    } else if (e.key === 'Escape') {
      if (affichee) {
        e.preventDefault()
        setOuverte(false)
        setActive(-1)
      } else if (requete) {
        e.preventDefault()
        changerRequete('')
      }
    }
  }

  return (
    <div class="ch-recherche">
      <MagnifyingGlassIcon class="ch-recherche-icone" size={20} aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-label="Rechercher un lieu par nom ou adresse"
        aria-autocomplete="list"
        aria-expanded={affichee}
        aria-controls={`${id}-liste`}
        aria-activedescendant={affichee && active >= 0 ? `${id}-option-${active}` : undefined}
        placeholder="Rechercher un lieu"
        autocomplete="off"
        spellcheck={false}
        value={requete}
        onInput={(e) => {
          changerRequete(e.currentTarget.value)
          setOuverte(true)
          setActive(-1)
        }}
        onKeyDown={touche}
        onBlur={() => setOuverte(false)}
        onFocus={() => setOuverte(true)}
      />
      <ul id={`${id}-liste`} role="listbox" aria-label="Suggestions de lieux" class="ch-suggestions" hidden={!affichee}>
        {suggestions.map((lieu, i) => (
          <li
            key={lieu.id}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={i === active}
            class={i === active ? 'ch-option-active' : undefined}
            // mousedown plutôt que click : le champ perdrait le focus (et la liste) avant le clic.
            onMouseDown={(e) => {
              e.preventDefault()
              valider(lieu)
            }}
          >
            <span class="ch-option-nom">{lieu.name}</span>
            {lieu.addr && <span class="ch-option-adresse">{lieu.addr}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
