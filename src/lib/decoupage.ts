/*
 * Découpe le HTML rendu d'un slot en ses nœuds de premier niveau.
 *
 * Dans coquille-web, le carrousel recevait ses diapositives comme enfants
 * React distincts (Children.toArray). Un composant Astro, lui, ne reçoit
 * qu'un slot déjà rendu en une seule chaîne : on la redécoupe, un enfant par
 * diapositive (Carrousel).
 *
 * Le HTML vient du compilateur d'Astro et de MDX, donc bien formé (balises
 * fermées, attributs entre guillemets, `<` et `>` échappés dans le texte) :
 * un petit lecteur qui suit la profondeur des balises suffit, sans dépendre
 * d'un analyseur HTML complet.
 */

export type Noeud = { type: 'element'; nom: string; html: string } | { type: 'texte'; html: string } | { type: 'commentaire'; html: string }

const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
// Leur contenu est du texte brut : un `<` n'y ouvre pas de balise
const TEXTE_BRUT = new Set(['script', 'style', 'textarea', 'title'])

/** Position du `>` qui ferme la balise ouverte en `debut`, guillemets compris */
function finDeBalise(html: string, debut: number) {
  let guillemet = ''
  for (let i = debut; i < html.length; i++) {
    const c = html[i]
    if (guillemet) {
      if (c === guillemet) guillemet = ''
    } else if (c === '"' || c === "'") {
      guillemet = c
    } else if (c === '>') {
      return i
    }
  }
  return html.length - 1
}

function noeudsDePremierNiveau(html: string): Noeud[] {
  const noeuds: Noeud[] = []
  let profondeur = 0
  let debutElement = 0
  let nomElement = ''
  let i = 0

  const ajouterTexte = (fin: number) => {
    if (profondeur === 0 && fin > i) {
      const texte = html.slice(i, fin)
      if (texte.trim()) noeuds.push({ type: 'texte', html: texte })
    }
  }

  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) {
      ajouterTexte(html.length)
      break
    }
    ajouterTexte(lt)

    if (html.startsWith('<!--', lt)) {
      const fin = html.indexOf('-->', lt + 4)
      const apres = fin === -1 ? html.length : fin + 3
      if (profondeur === 0) noeuds.push({ type: 'commentaire', html: html.slice(lt, apres) })
      i = apres
      continue
    }

    const fin = finDeBalise(html, lt)
    const balise = html.slice(lt, fin + 1)
    const fermante = balise.startsWith('</')
    const nom = (/^<\/?([a-zA-Z][\w:-]*)/.exec(balise)?.[1] ?? '').toLowerCase()

    if (!nom) {
      // `<!doctype>` ou `<` isolé : on le traite comme du texte
      i = fin + 1
      continue
    }

    if (fermante) {
      profondeur = Math.max(0, profondeur - 1)
      if (profondeur === 0) noeuds.push({ type: 'element', nom: nomElement, html: html.slice(debutElement, fin + 1) })
      i = fin + 1
      continue
    }

    if (profondeur === 0) {
      debutElement = lt
      nomElement = nom
    }

    if (TEXTE_BRUT.has(nom)) {
      const fermeture = html.toLowerCase().indexOf(`</${nom}`, fin + 1)
      const apres = fermeture === -1 ? html.length : finDeBalise(html, fermeture) + 1
      if (profondeur === 0) noeuds.push({ type: 'element', nom, html: html.slice(lt, apres) })
      i = apres
      continue
    }

    if (VIDES.has(nom) || balise.endsWith('/>')) {
      if (profondeur === 0) noeuds.push({ type: 'element', nom, html: balise })
    } else {
      profondeur++
    }
    i = fin + 1
  }

  return noeuds
}

// Ce que le rendu d'Astro peut glisser entre les enfants sans que ce soit du
// contenu (scripts des composants, styles) : ce ne sont pas des panneaux.
const HORS_CONTENU = new Set(['script', 'style', 'link', 'template'])

/**
 * Sépare les panneaux (un par enfant de premier niveau, comme
 * Children.toArray) de ce qui doit seulement être rendu à côté.
 */
export function panneauxDuSlot(html: string) {
  const panneaux: string[] = []
  const annexes: string[] = []
  for (const noeud of noeudsDePremierNiveau(html)) {
    if (noeud.type === 'commentaire') continue
    if (noeud.type === 'element' && HORS_CONTENU.has(noeud.nom)) annexes.push(noeud.html)
    else panneaux.push(noeud.html)
  }
  return { panneaux, annexes: annexes.join('') }
}
