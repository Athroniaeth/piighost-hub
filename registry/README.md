# Registre piighost hub

Les motifs, groupes et configs officiels, un dossier par objet. Le format est
décrit dans [docs/hub/manifest.md](../docs/hub/manifest.md), la résolution et les
commits dans [docs/hub/resolution.md](../docs/hub/resolution.md).

## Ajouter ou modifier un motif

1. Créez ou éditez `patterns/piighost/<name>/pattern.toml`. Exemples synthétiques
   uniquement, tags pris dans `vocabulary.toml`.
2. `just hub-check` : structure, exemples, résilience, borne de backtracking,
   composition de tout ce qui utilise le motif.
3. `just hub-record` : enregistre la nouvelle tête comme commit immuable sous
   `commits/`. Committez le manifeste et l'instantané ensemble.
4. Pour déplacer un tag, éditez le `tags.toml` de l'objet avec le commit voulu.

Un commit enregistré ne se modifie ni ne se supprime. `hub check` le vérifie.
