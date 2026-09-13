# Le site

Une application Svelte servie par nginx, qui parle à l'API sous `/api/v1` en
origine unique. Sept routes, aucun état côté serveur, aucun compte.

| Route | Ce qu'on y fait |
|---|---|
| `/` | chercher et parcourir le catalogue ; les filtres vivent dans l'URL |
| `/r/:ns/:name[/:selector]` | une fiche d'objet : le contenu à gauche, la mesure et l'historique dessous, « l'utiliser » à droite |
| `/playground` | lancer un objet ou un regex candidat sur un texte |
| `/playground/compare` | deux à quatre objets sur le même texte |
| `/playground/chat` | l'aller-retour complet, avec un assistant scripté |
| `/contribute` | vérifier un manifeste et ouvrir une pull request |
| `/labels` | les labels que le registre peut émettre, depuis le pied de page |

Trois entrées de navigation, pas plus : Catalogue, Bac à sable, Contribuer.
Comparer et le chat sont des onglets du bac à sable, parce qu'ils partagent sa
grammaire et son texte d'entrée.

## Charte

Le site reprend la charte de `piighost-studio` pour que l'écosystème se lise
d'un seul tenant : l'échelle neutre de shadcn, un seul violet primaire, Geist
pour le texte et Geist Mono pour le code et la marque, un rayon de base de
0,625 rem. Le clair est le défaut et le sombre est une classe sur `<html>`
posée par le visiteur, jamais déduite du système, comme le studio le fait.

Les polices sont auto-hébergées par `@fontsource-variable/geist`, la CSP ne
laissant aucune autre origine. Les icônes viennent de lucide, une par import.

**Trois surfaces, une grammaire.** Le bac à sable, la comparaison, le chat et
la page de contribution sont une même carte en trois colonnes numérotées,
Configurer, Texte, Résultats, avec un en-tête de région identique. C'est le
composant `Region` qui porte cette grammaire, et les quatre pages l'importent.

**Les couleurs d'entités sont celles du studio.** Une palette de quinze teintes
attribuée par ordre d'apparition, `PERSON` sur le primaire, portée
verbatim de `labels.ts`. Un label garde donc la même couleur dans le hub et
dans le bac à sable du studio.

**Les composants.** Sous `components/ui/` : `Button`, `Badge`, `Card`,
`Segmented`, `Tabs`, `Region`, `StepChip`, `CodeBlock`, `CopyButton`. Au-dessus :
`EntityLabel`, `EntityRow`, `EntityHighlight`, `ObjectCard`, `RefPicker`,
`SamplePicker`, `SiteNav`, `SiteFooter`. Les contrôles natifs partagent leurs
classes depuis `lib/ui.ts` plutôt qu'un composant par champ.

## Choix qui se voient

**Les filtres vivent dans l'URL.** Une vue filtrée doit être partageable, et le
bouton retour doit défaire un filtre plutôt que quitter la page. Le catalogue lit
donc `q`, `kind`, `tag` (répétable) et `label` depuis la query, et n'a pas d'état
propre.

**Deux langues, jusque dans les manifestes.** Le registre est bilingue par
construction, chaque description portant `en` et `fr`. Le sélecteur de langue
écrit aussi `document.documentElement.lang`, dont un lecteur d'écran tire sa
voix.

**Aucun style en ligne.** La CSP de production autorise `style-src 'self'` sans
`unsafe-inline`. Une coloration syntaxique qui émettrait `style="color:…"`
marcherait en développement et casserait en production, donc la coloration passe
par des classes et les couleurs vivent dans la feuille de style. Le bundle
construit ne contient aucun attribut `style`.

**Une fiche imprimable.** La classe `no-print` retire les contrôles, et la
feuille bascule en noir sur blanc. Un DPO lit une fiche de couverture sur
papier, pas un fichier TOML.

**Un routeur en un fichier.** Sept routes, pas de layouts imbriqués : une
dépendance de routage coûterait plus en indirection qu'elle n'apporte. nginx
sert déjà `index.html` en repli, ce dont un routeur d'historique a besoin. Les
liens restent de vrais `<a href>`, donc le clic du milieu et l'ouverture dans un
onglet marchent.

## Ce que le bac à sable ne fait pas

Les détecteurs à modèle, GLiNER2 et spaCy, ne tournent pas : il faudrait
télécharger et charger des poids à chaque requête. Une configuration qui en
porte un est quand même exécutable, ses détecteurs regex tournent, et la réponse
nomme ce qui a été sauté dans `unsupported`. La fiche le dit aussi.

Faire tourner un modèle dans le navigateur via Pyodide, comme le site de
présentation de `piighost` le fait, reste la bonne réponse à terme : le texte ne
quitterait pas la machine, ce qui est exactement l'argument pour un outil de PII.
C'est une application à part entière, pas une case à cocher ici.
