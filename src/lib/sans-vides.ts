import { z } from 'astro/zod'

/*
 * Champs vidés dans Decap.
 *
 * Decap 3 n'a pas d'option pour omettre un champ facultatif laissé vide : un
 * texte effacé est écrit `''`, un nombre ou une liste effacés `null`. Les
 * schémas refuseraient ces valeurs (`.email()`, `.url()`, `min(1)`, regex) et
 * le build échouerait pour un champ facultatif. On retire donc, avant la
 * validation, toute clé dont la valeur est vide (`''`, espaces seules ou
 * `null`), ainsi que les éléments vides d'une liste (« psychologie, » saisi
 * dans une liste simple). Un champ obligatoire vidé reste refusé, avec le
 * message « obligatoire » plutôt qu'une erreur de format.
 */

const estVide = (valeur: unknown) => valeur === null || (typeof valeur === 'string' && valeur.trim() === '')

const estObjetSimple = (valeur: unknown): valeur is Record<string, unknown> =>
  typeof valeur === 'object' && valeur !== null && Object.getPrototypeOf(valeur) === Object.prototype

export function sansVides(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.filter((element) => !estVide(element)).map(sansVides)
  if (estObjetSimple(valeur)) {
    return Object.fromEntries(Object.entries(valeur).flatMap(([cle, v]) => (estVide(v) ? [] : [[cle, sansVides(v)]])))
  }
  return valeur
}

/** Schéma qui ignore les champs vidés dans Decap (voir plus haut) */
export const sansChampsVides = <S extends z.ZodType>(schema: S) => z.preprocess(sansVides, schema)
