// Contrôle des points de rupture : toute requête @media sur la largeur doit
// utiliser un seuil du thème (600, 900, 1200, 1536 px). Les mises en page qui
// demandent une autre largeur utilisent une requête de conteneur (@container),
// pas une requête sur l'écran. Voir docs/CONVENTIONS.md, « Points de rupture ».
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SEUILS = new Set([600, 900, 1200, 1536])
const EXCEPTIONS = new Set()

const fichiers = []
const parcourir = (dossier) => {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) parcourir(chemin)
    else if (/\.(astro|css|ts|tsx|mjs|mdx)$/.test(nom)) fichiers.push(chemin)
  }
}
parcourir('src')

const comptes = new Map()
const horsListe = []
for (const fichier of fichiers) {
  const lignes = readFileSync(fichier, 'utf8').split('\n')
  lignes.forEach((ligne, i) => {
    // Requêtes @media en CSS, et matchMedia en JS : mêmes seuils, même forme
    const requetes = [...ligne.matchAll(/@media[^{]*/g)].map((m) => m[0])
    for (const m of ligne.matchAll(/matchMedia\((['"`])(.*?)\1/g)) requetes.push(m[2])
    for (const requete of requetes) {
      const signaler = (raison) => horsListe.push(`${fichier}:${i + 1}  ${requete.trim()}  (${raison})`)
      // Une seule syntaxe, celle des intervalles : (width >= 900px), et son
      // complément (width < 900px) ; jamais min-width ni max-width, dont le
      // complément s'écrivait 899px ou 899.98px
      if (/\b(min|max)-width\s*:/.test(requete)) signaler('écrire (width >= …) ou (width < …)')
      for (const [, valeur] of requete.matchAll(/([\d.]+)px/g)) {
        if (!/^\d+$/.test(valeur)) { signaler(`${valeur}px : seuil non entier`); continue }
        const px = Number(valeur)
        comptes.set(px, (comptes.get(px) ?? 0) + 1)
        if (!SEUILS.has(px) && !EXCEPTIONS.has(px)) signaler(`${px}px hors liste`)
      }
    }
  })
}

console.log('Seuils utilisés (requêtes @media sur la largeur) :')
for (const [px, n] of [...comptes].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(px).padStart(5)} px  ${String(n).padStart(3)} fois${EXCEPTIONS.has(px) ? '  (exception documentée)' : ''}`)
}
if (horsListe.length) {
  console.error('\nSeuils hors liste :')
  for (const l of horsListe) console.error('  ' + l)
  process.exit(1)
}
console.log('\nOK : tous les seuils sont dans la liste du thème.')
