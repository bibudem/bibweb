import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserLien } from './liens.ts'

test('un chemin du site et le site lui-même sont internes', () => {
  assert.equal(analyserLien('/espaces/').interne, true)
  assert.equal(analyserLien('#trouver-un-lieu').interne, true)
  assert.equal(analyserLien('https://bib.umontreal.ca/horaires/').interne, true)
})

test('les sous-domaines des bibliothèques sont externes (flèche ↗)', () => {
  assert.equal(analyserLien('https://boite-outils.bib.umontreal.ca/citer').interne, false)
  assert.equal(analyserLien('https://studio.bib.umontreal.ca/').interne, false)
  assert.equal(analyserLien('https://calendrier.bib.umontreal.ca/r').interne, false)
})

test('courriel, téléphone et autres sites sont externes', () => {
  assert.equal(analyserLien('mailto:recherche@bib.umontreal.ca').interne, false)
  assert.equal(analyserLien('tel:+15143437771').interne, false)
  assert.equal(analyserLien('https://umontreal.scholaris.ca/').interne, false)
})
