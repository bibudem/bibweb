import { test } from 'node:test'
import assert from 'node:assert/strict'
import { descriptionAuto } from './extrait.ts'

test('une directive sans texte (:nombre-liens) ne passe pas dans la description', () => {
  const corps = 'Découvrez un répertoire évolutif de :nombre-liens bibliographies thématiques créées par la communauté de l’Université de Montréal.'
  assert.equal(descriptionAuto(corps, undefined, true), 'Découvrez un répertoire évolutif de bibliographies thématiques créées par la communauté de l’Université de Montréal.')
})

test('un deux-points typographique et une adresse ne sont pas des directives', () => {
  const corps = 'Horaire : ouvert de 9 h à 17 h, voir https://bib.umontreal.ca/horaires/ pour les autres bibliothèques du réseau.'
  assert.equal(descriptionAuto(corps, undefined, true), corps)
})

test('un paragraphe suivi d’une liste (« Considérant que ») est sauté', () => {
  const corps = 'Considérant que\n\n- un point;\n- un autre point.\n\nLe code de conduite s’applique à toute personne qui fréquente les bibliothèques, en tout temps et en tout lieu.'
  assert.equal(descriptionAuto(corps, undefined, true), 'Le code de conduite s’applique à toute personne qui fréquente les bibliothèques, en tout temps et en tout lieu.')
})

test('une phrase complète suivie d’une liste reste dans la description', () => {
  const corps = 'Voici les noms des personnes lauréates pour l’édition 2025-2026 des bourses Geneviève-Bazin et Charles S. N.-Parent.\n\n- **Emma**, étudiante au doctorat.'
  assert.equal(descriptionAuto(corps, undefined, true), 'Voici les noms des personnes lauréates pour l’édition 2025-2026 des bourses Geneviève-Bazin et Charles S. N.-Parent.')
})
