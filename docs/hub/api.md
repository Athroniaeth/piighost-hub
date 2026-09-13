# API HTTP du hub

Lecture seule, publique, sous `/api/v1`. C'est ce que la future CLI `piighost
hub` et le site consomment. Les routes ne portent pas la clé d'API du template :
elles ne servent que ce que le registre publie, et un tiers doit pouvoir résoudre
une référence depuis son propre déploiement. Le quota par client et la limite de
taille de corps s'appliquent comme au reste de l'API. Le contrat exact est
`openapi.json` à la racine, régénéré par `just types`.

| Route | Renvoie |
|---|---|
| `GET /api/v1/vocabulary` | le vocabulaire des tags, avec `kind` et libellés |
| `GET /api/v1/refs?kind=&tag=` | la liste des objets : clé, type, description, tags, commit `latest`, pointeurs |
| `GET /api/v1/refs/{ns}/{name}` | un objet et la liste de ses commits |
| `GET /api/v1/refs/{ns}/{name}/{selector}` | un commit : digest, date, contenu figé |
| `GET /api/v1/refs/{ns}/{name}/{selector}/resolved` | la résolution : labels et provenance pour un motif ou un groupe, détecteurs et étages pour une config, et le pipeline rendu |
| `GET /api/v1/refs/{ns}/{name}/{selector}/pipeline.toml?memory=&keep_refs=` | le pipeline piighost en TOML, `application/toml` |

`{selector}` est un tag, `latest` compris, ou un commit de huit caractères
hexadécimaux.

## Cache

Chaque réponse sélectionnée porte `ETag: "<digest complet>"`. Un sélecteur qui est
un commit renvoie `Cache-Control: public, max-age=31536000, immutable`, car ce
contenu ne changera jamais. Un tag renvoie `Cache-Control: public, no-cache` : le
client peut garder la réponse mais doit la revalider, le tag ayant pu bouger.

## Erreurs

Corps `application/problem+json`.

| Code | Quand |
|---|---|
| 400 | un espace de noms, un nom ou un sélecteur ne suit pas la grammaire |
| 404 | objet, tag ou commit inconnu |
| 422 | la résolution échoue sur un commit servi, par exemple une collision de labels dans une tête non encore vérifiée |

## Exemples

```bash
curl -s http://127.0.0.1:5173/api/v1/refs?kind=group | jq '.items[].key'
curl -s http://127.0.0.1:5173/api/v1/refs/piighost/fr/latest/resolved | jq '.labels[] | {label, pattern}'
curl -s "http://127.0.0.1:5173/api/v1/refs/piighost/fr-default/latest/pipeline.toml?memory=redis" -o pipeline.toml
```
