import type { APIRoute } from 'astro'
import jetons from '@/styles/tokens.css?raw'
import theme from './_theme.css?raw'

/*
 * Feuille de style de l'interface de rédaction (/admin/theme.css), liée par
 * public/admin/index.html : les jetons Harmonium du site (couleurs, polices,
 * rayons, ombres ; src/styles/tokens.css), puis le thème de Decap
 * (_theme.css). Une seule source pour les jetons : l'admin suit le site.
 * Les polices (Figtree, Lora) sont chargées par index.html.
 */

export const prerender = true

export const GET: APIRoute = () =>
  new Response(`${jetons}\n${theme}`, {
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  })
