import type { CollectionEntry } from 'astro:content'

/** Bloc d'une vitrine, d'après les types générés depuis src/lib/schema-vitrines.ts */
export type Bloc = CollectionEntry<'vitrines'>['data']['sections'][number]

/** Bloc d'un type donné */
export type BlocDe<T extends Bloc['type']> = Extract<Bloc, { type: T }>
