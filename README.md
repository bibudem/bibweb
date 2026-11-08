# bibweb

Site des Bibliothèques de l'Université de Montréal : https://bib.umontreal.ca
Site statique construit avec [Astro](https://astro.build), converti de l'ancien site Gatsby (`coquille-web`) en gardant ses adresses.

## Démarrer

Node 22.22 ou plus récent.

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # site statique dans dist/
npm run preview      # sert dist/
npm run verifier     # contrôle toutes les pages sur le serveur de dev
npm test             # tests unitaires
```

| Commande | Effet |
| :-- | :-- |
| `npm run dev:fond` / `dev:arreter` | Serveur de dev en arrière-plan / l'arrêter |
| `npm run dev:propre` | Après une modification d'un plugin ou du schéma : vide le cache du contenu et relance |
| `npm run cms:local` | Essayer l'interface de rédaction (`/admin/`) sans GitHub |
| `npm run indexer:externes` | Relève les pages de Studio·bib et de la Boîte à outils (`/search-index-externe.json`) pour la recherche du menu et `/resultats/` |

## Structure

| Dossier | Contenu |
| :-- | :-- |
| `src/` | Le site lui-même. Les textes des pages sont dans `src/content/` (Markdown pour les pages, YAML pour les pages d'accueil de section) et les listes partagées (menus, bibliothèques…) dans `src/data/` ; le reste est le code qui les met en forme. |
| `public/` | Fichiers servis tels quels : PDF, redirections (`_redirects`), quelques applications autonomes. |
| `scripts/` | Outils pour les développeurs, comme la vérification de toutes les pages (`npm run verifier`). |
| `dist/` | Le site prêt à publier, créé par `npm run build`. Ne pas modifier à la main. |

À la racine, `astro.config.mjs` règle le site.

## Publication

| Branche | Rôle |
| :-- | :-- |
| `main` | Travail courant. L'interface de rédaction (Decap CMS, `/admin/`) y enregistre directement. Chaque poussée reconstruit la pré-production (https://bibudem.github.io/bibweb/), puis ouvre ou met à jour la pull request `main` → `production`. |
| `production` | Le site en ligne. On y arrive en fusionnant cette pull request, avec « Create a merge commit ». Chaque fusion construit le site de production. |
| `site-production` | Produite automatiquement : le site construit (`dist/`), que le serveur des Bibliothèques récupère. Ne pas modifier. |

Workflows (`.github/workflows/`) :

| Fichier | Rôle |
| :-- | :-- |
| `deployer-pages.yml` | Pré-production sur GitHub Pages et pull request vers `production` |
| `deployer-production.yml` | Build de production, livré dans `site-production` (et par `rsync` si les secrets `DEPLOY_*` sont réglés) |
| `verifier-pr.yml` | Build de vérification de chaque pull request ouverte par une personne |
| `relever-externes.yml` | Chaque lundi, relevé de Studio·bib et de la Boîte à outils pour la recherche du menu |

Le site publie aussi `/llms.txt` et une version Markdown de chaque page (`…/index.md`) pour les agents d'IA, ainsi qu'un plan du site (`/sitemap-index.xml`).

## Qualité

- **Accessibilité** : WCAG 2.2 AA.
- **Sobriété** : HTML statique, peu de JavaScript, images AVIF et WebP, aucun service tiers avant le consentement.
- **Robustesse** : une erreur de contenu (champ, icône, image introuvable) fait échouer le build avec le fichier fautif.

