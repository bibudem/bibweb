// Statut des lieux : minuit, journées complètes, « ouvre lundi ».
// Lancer avec `npm test` (node --test, sans dépendance).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserHoraires, ajouterJours, lundiDe, normaliser, statutDe, type ReponseApi } from './horaires.ts'
import type { Lieu } from './lieux.ts'

const lieu = { codeBib: 'ss' } as Lieu

// Un jour de l'API : debut1 et fin2 seulement pour une plage continue
const jour = (date: string, debut?: string, fin?: string) => ({ date: `${date}T00:00:00-04:00`, bibliotheque: 'ss', service: 'regulier', debut1: debut, fin2: fin })
const horaires = (...jours: ReturnType<typeof jour>[]) => analyserHoraires({ evenements: jours } as ReponseApi)
const statut = (h: ReturnType<typeof horaires>, date: string, heure: number, dates: string[]) => statutDe(lieu, h, { date, minutes: heure * 60 }, dates).texte

test('lundiDe : un dimanche appartient à la semaine du lundi précédent', () => {
  assert.equal(lundiDe('2026-11-01'), '2026-10-26')
  assert.equal(lundiDe('2026-10-26'), '2026-10-26')
  assert.equal(ajouterJours('2026-10-31', 1), '2026-11-01') // changement d'heure le 1er novembre
})

test('« 07:00 → 00:00 » ferme à minuit, pas à 0 h', () => {
  const h = horaires(jour('2026-10-28', '07:00', '00:00'), jour('2026-10-29', '07:00', '23:00'))
  assert.equal(statut(h, '2026-10-28', 22, ['2026-10-28', '2026-10-29']), "Ouvert jusqu'à minuit")
  assert.equal(statut(h, '2026-10-28', 23.75, ['2026-10-28', '2026-10-29']), 'Ferme bientôt, à minuit')
})

test('« 00:00 → 24:00 » enchaîné : on suit la plage jusqu’à sa vraie fin', () => {
  const h = horaires(jour('2026-12-07', '08:00', '00:00'), jour('2026-12-08', '00:00', '24:00'), jour('2026-12-09', '00:00', '18:00'))
  assert.equal(statut(h, '2026-12-07', 10, ['2026-12-07', '2026-12-08', '2026-12-09']), "Ouvert jusqu'à mercredi à 18 h")
})

test('fermeture au-delà des jours chargés : pas de « 24 h sur 24 »', () => {
  const h = horaires(jour('2026-12-07', '08:00', '00:00'), jour('2026-12-08', '00:00', '24:00'))
  assert.equal(statut(h, '2026-12-07', 10, ['2026-12-07', '2026-12-08']), 'Ouvert sans interruption')
})

test('dimanche soir, lundi fermé : on cherche le prochain jour ouvert', () => {
  const h = horaires(jour('2026-11-01', '10:00', '18:00'), jour('2026-11-02'), jour('2026-11-03', '08:00', '22:00'))
  const dates = ['2026-11-01', '2026-11-02', '2026-11-03']
  assert.equal(statut(h, '2026-11-01', 20, dates), 'Fermé, ouvre mardi à 8 h')
  assert.equal(statut(h, '2026-11-01', 9, dates), 'Fermé, ouvre à 10 h')
})

test('congé des Fêtes : au-delà de six jours, la date de réouverture est donnée', () => {
  const dates = Array.from({ length: 14 }, (_, i) => ajouterJours('2026-12-23', i))
  const h = horaires(jour('2026-12-23', '08:00', '17:00'), ...dates.slice(1, 13).map((d) => jour(d)), jour('2027-01-05', '08:00', '17:00'))
  assert.equal(statut(h, '2026-12-23', 20, dates), 'Fermé, ouvre le mardi 5 janvier à 8 h')
})

test('bibliothèque absente de la réponse : horaire inconnu, pas « Fermé »', () => {
  assert.equal(statutDe(lieu, analyserHoraires({ evenements: [] } as unknown as ReponseApi), { date: '2026-11-02', minutes: 600 }, ['2026-11-02']).etat, 'unknown')
})

test('réponse ou heures malformées : ignorées sans erreur', () => {
  assert.doesNotThrow(() => analyserHoraires({ evenements: 'x' } as unknown as ReponseApi))
  const h = horaires(jour('2026-11-02', '8h00', '17h00'))
  assert.equal(statut(h, '2026-11-02', 10, ['2026-11-02']), 'Fermé')
})

test('recherche : tirets, apostrophes courbes et espaces multiples', () => {
  assert.equal(normaliser('Hubert-Reeves'), normaliser('hubert   reeves'))
  assert.equal(normaliser('Marguerite-d’Youville'), normaliser("marguerite d'youville"))
})

test('plage de la veille qui passe minuit : encore ouvert à 0 h 30', () => {
  const h = horaires(jour('2026-11-02', '08:00', '01:00'), jour('2026-11-03', '08:00', '17:00'))
  assert.equal(statut(h, '2026-11-03', 0.5, ['2026-11-03']), 'Ferme bientôt, à 1 h')
  assert.equal(statut(h, '2026-11-03', 2, ['2026-11-03']), 'Fermé, ouvre à 8 h')
})
