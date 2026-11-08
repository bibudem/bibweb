import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtrer, jetonsDe, numeros, paginer, suite, texteStatut, type DonneesFiche } from './filtre.ts'
import { SEPARATEUR } from './normaliser.ts'

const fiche = (texte: string, bibliotheques: string[] = [], disciplines: string[] = []): DonneesFiche => ({
  texte,
  bibliotheque: bibliotheques.join(SEPARATEUR),
  discipline: disciplines.join(SEPARATEUR),
})
const lire = (f: DonneesFiche) => f
const tous = { recherche: '', bibliotheque: '', discipline: '' }

const marie = fiche('tremblay marie bibliothecaire droit', ['droit'], ['droit', 'criminologie'])
const jean = fiche('gagnon jean technicien sante', ['sante', 'directiondesbibliotheque'], ['medecine'])
const lea = fiche('cote lea conseillere mathematiques', ['mathinfo'], [])

test('la recherche ignore accents, casse, apostrophes et espaces en trop', () => {
  assert.deepEqual(jetonsDe('  Bibliothécaire   DROIT '), ['bibliothecaire', 'droit'])
  assert.deepEqual(jetonsDe('l’Écuyer'), ['lecuyer'])
  assert.deepEqual(jetonsDe('   '), [])
})

test('sans critère, toutes les fiches sont retenues, dans leur ordre', () => {
  assert.deepEqual(filtrer([marie, jean, lea], tous, lire), [marie, jean, lea])
})

test('tous les mots cherchés doivent figurer, même en milieu de mot', () => {
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, recherche: 'Marie Droit' }, lire), [marie])
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, recherche: 'santé' }, lire), [jean])
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, recherche: 'nicien' }, lire), [jean])
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, recherche: 'marie sante' }, lire), [])
})

test('bibliothèque et discipline comparent des valeurs entières de la liste', () => {
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, bibliotheque: 'sante' }, lire), [jean])
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, bibliotheque: 'directiondesbibliotheque' }, lire), [jean])
  // Une partie de valeur ne suffit pas (« math » n'est pas « mathinfo »)
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, bibliotheque: 'math' }, lire), [])
  assert.deepEqual(filtrer([marie, jean, lea], { ...tous, discipline: 'criminologie' }, lire), [marie])
})

test('les critères se cumulent', () => {
  assert.deepEqual(filtrer([marie, jean, lea], { recherche: 'tremblay', bibliotheque: 'droit', discipline: 'droit' }, lire), [marie])
  assert.deepEqual(filtrer([marie, jean, lea], { recherche: 'tremblay', bibliotheque: 'sante', discipline: '' }, lire), [])
})

test('une fiche sans données ne correspond qu’en l’absence de critère', () => {
  assert.deepEqual(filtrer([{}], tous, lire), [{}])
  assert.deepEqual(filtrer([{}], { ...tous, recherche: 'a' }, lire), [])
  assert.deepEqual(filtrer([{}], { ...tous, discipline: 'droit' }, lire), [])
})

test('paginer : 8 par page, page ramenée dans les bornes', () => {
  const vingt = Array.from({ length: 20 }, (_, i) => i)
  assert.deepEqual(paginer(vingt, 1), { page: 1, nombrePages: 3, visibles: [0, 1, 2, 3, 4, 5, 6, 7] })
  assert.deepEqual(paginer(vingt, 3), { page: 3, nombrePages: 3, visibles: [16, 17, 18, 19] })
  // Un filtre plus strict ne laisse qu'une page : on y revient
  assert.deepEqual(paginer(vingt.slice(0, 5), 3), { page: 1, nombrePages: 1, visibles: [0, 1, 2, 3, 4] })
  // Aucun résultat : une page, vide
  assert.deepEqual(paginer([], 2), { page: 1, nombrePages: 1, visibles: [] })
})

test('texte du statut', () => {
  assert.equal(texteStatut(0, 1, 1), 'Aucune personne ne correspond à ces critères.')
  assert.equal(texteStatut(1, 1, 1), '1 personne')
  assert.equal(texteStatut(8, 1, 1), '8 personnes')
  assert.equal(texteStatut(141, 2, 18), '141 personnes, page 2 sur 18')
})

test('numeros : toutes les pages quand elles tiennent', () => {
  assert.deepEqual(numeros(1, 1, 1), [1])
  assert.deepEqual(numeros(4, 7, 1), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(numeros(1, 5, 0), [1, 2, 3, 4, 5])
})

test('numeros : premières et dernières pages, courante et voisines (MUI)', () => {
  // Un saut entre deux numéros est une ellipse
  assert.deepEqual(numeros(1, 18, 1), [1, 2, 3, 4, 5, 18])
  assert.deepEqual(numeros(9, 18, 1), [1, 8, 9, 10, 18])
  assert.deepEqual(numeros(18, 18, 1), [1, 14, 15, 16, 17, 18])
  assert.deepEqual(numeros(9, 18, 0), [1, 9, 18])
  assert.deepEqual(numeros(2, 18, 0), [1, 2, 3, 18])
})

test('numeros : le nombre de cases reste constant (2 × voisines + 5)', () => {
  const cases = (liste: number[]) => liste.length + liste.slice(1).filter((n, i) => n - liste[i] > 1).length
  for (const voisines of [0, 1]) {
    for (let page = 1; page <= 18; page++) assert.equal(cases(numeros(page, 18, voisines)), 2 * voisines + 5, `page ${page}, voisines ${voisines}`)
  }
})

test('suite : numéros larges et compacts réunis, ellipses marquées', () => {
  assert.deepEqual(suite(1, 3), [{ numero: 1, seulement: undefined }, { numero: 2, seulement: undefined }, { numero: 3, seulement: undefined }])
  assert.deepEqual(suite(9, 18), [
    { numero: 1, seulement: undefined },
    { ellipse: true, seulement: undefined },
    { numero: 8, seulement: 'large' },
    { numero: 9, seulement: undefined },
    // Sous 600 px, 9 est suivi de l'ellipse ; au-delà, de 10 puis de l'ellipse
    { ellipse: true, seulement: 'compacte' },
    { numero: 10, seulement: 'large' },
    { ellipse: true, seulement: 'large' },
    { numero: 18, seulement: undefined },
  ])
})
