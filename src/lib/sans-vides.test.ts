import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sansVides } from './sans-vides.ts'

test('un champ vidé dans Decap est retiré, pas transmis vide', () => {
  assert.deepEqual(sansVides({ prenom: 'Ana', telephone: '', courriel: '  ', ordre: null }), { prenom: 'Ana' })
})

test('les éléments vides d’une liste sont retirés, à toute profondeur', () => {
  assert.deepEqual(sansVides({ personnes: [{ disciplines: ['psychologie', ''] }] }), { personnes: [{ disciplines: ['psychologie'] }] })
})

test('les autres valeurs sont gardées telles quelles', () => {
  const date = new Date('2026-01-05')
  assert.deepEqual(sansVides({ date, n: 0, faux: false, texte: 'a' }), { date, n: 0, faux: false, texte: 'a' })
})
