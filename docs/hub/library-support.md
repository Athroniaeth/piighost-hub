# Ce qui revient à `piighost`

Le hub publie, vérifie et sert. Consommer une référence depuis un déploiement
revient à la bibliothèque, et ce travail vit dans son dépôt, pas ici. Ce document
fixe le contrat pour que les deux côtés puissent avancer séparément.

Tant que ce support n'existe pas, rien n'est bloqué : l'export **aplati** inline
chaque regex, donc un fichier téléchargé aujourd'hui tourne sur `piighost` 1.7
sans aucune modification. Le support `hub:` supprime l'étape de téléchargement,
il ne débloque pas un usage.

## Résoudre une référence dans `catalogs`

```toml
[detector]
type = "regex"
catalogs = ["generic", "hub:piighost/fr-extended:prod"]
```

`RegexDetectorConfig.catalogs` accepte aujourd'hui quatre littéraux. Il faudrait
accepter en plus une chaîne préfixée `hub:`, résolue **à la construction**
(`build()`), jamais à la validation, pour que `piighost validate` reste hors
ligne et rapide. La fusion ne change pas : les catalogues d'abord, dans l'ordre,
puis les patterns en ligne, ce qui est déjà l'ordre d'insertion que le hub
garantit.

## Charger une configuration entière

```python
from piighost.config import load_pipeline

pipeline = load_pipeline("hub:piighost/fr-default:prod")
```

`load_config`, `load_pipeline` et `load_thread_pipeline` prennent un chemin. Ils
accepteraient une référence `hub:`, en récupérant
`/api/v1/refs/{ns}/{name}/{selector}/pipeline.toml` sous forme aplatie. Une
configuration du hub ne porte jamais de `[memory]`, donc
`load_thread_pipeline` la refuserait comme aujourd'hui ; l'appelant fournit sa
mémoire, par la surcharge d'environnement `PIIGHOST_MEMORY` ou par le chemin
programmatique.

## Sous-commandes

| Commande | Rôle |
|---|---|
| `piighost hub pull REF [-o FILE] [--keep-refs] [--memory TYPE]` | écrit un pipeline TOML, aplati par défaut |
| `piighost hub resolve REF`, `info REF`, `search`, `tags REF`, `log REF` | inspection |
| `piighost hub lock [CONFIG]` | fige chaque référence en commit et digest dans `piighost.lock` |
| `piighost hub verify [CONFIG] [--offline]` | compare au lock, code 1 sur toute dérive |
| `piighost hub lock --update` | re-résout les tags quand on décide de suivre |

## Ordre de résolution et confiance

1. le lock, s'il existe ;
2. le cache local ;
3. le réseau, sauf `PIIGHOST_HUB_OFFLINE`.

Le digest est vérifié quelle que soit la source, et un écart lève `ConfigError`
plutôt que de démarrer. Un commit est immuable, donc une réponse servie par
commit se cache indéfiniment ; une réponse servie par tag doit être revalidée,
ce que l'API annonce déjà dans ses en-têtes.

| Variable | Rôle | Défaut |
|---|---|---|
| `PIIGHOST_HUB_URL` | URL de base, pour un miroir interne | l'instance publique |
| `PIIGHOST_HUB_CACHE` | dossier du cache | `~/.cache/piighost/hub` |
| `PIIGHOST_HUB_OFFLINE` | interdit tout appel réseau | non défini |
| `PIIGHOST_HUB_TOKEN` | jeton bearer pour un miroir privé | non défini |

Une configuration est de la donnée déclarative, pas du code, mais une résolution
réseau au démarrage reste une dépendance : le lock, le cache et le miroir
existent pour qu'un déploiement n'en dépende pas au moment où il démarre.

## Une limite que la bibliothèque seule peut lever

Deux motifs qui couvrent le même span sont départagés par l'ordre d'insertion,
puisque toute détection regex vaut une confiance de 1. Cela règle les spans
identiques, pas les spans différents mais chevauchants : sur `01.99.00.12.34`,
une IPv4 qui commence au même endroit mais finit plus tôt l'emporte sur le
téléphone français, quel que soit l'ordre. Le hub a contourné ce cas en
resserrant son motif IPv4, ce qui était de toute façon correct, mais le levier
général, une priorité par motif dans `RegexDetector`, est du côté de la
bibliothèque.
