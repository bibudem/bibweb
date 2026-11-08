/*
 * Analyse d'une adresse de lien, partagée par Lien, Bouton,
 * ElementListeLiens et les cartes.
 *
 * Interne : un chemin du site, ou une adresse absolue du site lui-même
 * (bib.umontreal.ca et ses environnements bib-pp, bib-prod). Les
 * sous-domaines (boite-outils.bib…, studio.bib…, calendrier.bib…) sont
 * externes : le visiteur change de site, d'interface et de navigation, la
 * flèche ↗ doit le dire. coquille-web (isInternalLink) les comptait comme
 * internes. mailto: et tel: (origine nulle) sont externes. On corrige aussi
 * le bogue de Bouton, qui passait une URL absolue de sous-domaine au routeur
 * de Gatsby : ici, tout finit dans un <a> ordinaire.
 */

const HOTES_INTERNES = new Set(['bib.umontreal.ca', 'bib-pp.umontreal.ca', 'bib-prod.umontreal.ca'])

type AnalyseLien = {
  /** Chemin du site ou adresse de la famille Bibliothèques */
  interne: boolean
  /** mailto: ou tel: */
  courrielOuTelephone: boolean
  /** Le fichier visé est un PDF (l'icône vient du CSS global) */
  pdf: boolean
}

export function analyserLien(adresse: string | undefined | null): AnalyseLien {
  const href = (adresse ?? '').trim()
  const courrielOuTelephone = /^(mailto|tel):/i.test(href)
  // Même détection que le CSS global (href$=.pdf, .pdf#, .pdf?)
  const pdf = /\.pdf([?#]|$)/i.test(href)
  let interne = false
  try {
    const url = new URL(href, 'https://bib.umontreal.ca')
    interne = url.origin !== 'null' && HOTES_INTERNES.has(url.hostname)
  } catch {
    interne = false
  }
  return { interne, courrielOuTelephone, pdf }
}

/** Texte masqué qui annonce ce que la vue seule laisse deviner (PDF, onglet) */
export function annonceLien({ pdf, nouvelOnglet }: { pdf: boolean; nouvelOnglet: boolean }) {
  const parties = [pdf && 'PDF', nouvelOnglet && 'nouvel onglet'].filter(Boolean)
  return parties.length ? ` (${parties.join(', ')})` : ''
}

/*
 * Lien d'une carte : l'analyse est calculée au build, plus d'icône ni de
 * `rel` qui changent après l'hydratation comme dans la source.
 */

/** Attributs et annonce d'un lien de carte (la source ne posait que rel="noopener") */
export function lienCarte(href: string, target?: string, rel?: string) {
  const { interne, pdf } = analyserLien(href)
  const nouvelOnglet = target === '_blank'
  const rels = new Set((rel ?? '').split(/\s+/).filter(Boolean))
  if (!interne || nouvelOnglet) rels.add('noopener')
  return {
    interne,
    rel: rels.size ? [...rels].join(' ') : undefined,
    annonce: annonceLien({ pdf, nouvelOnglet }),
  }
}
