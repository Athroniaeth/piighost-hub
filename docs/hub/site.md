# Le site

Une application Svelte servie par nginx, qui parle à l'API sous `/api/v1` en
origine unique. Sept routes, aucun état côté serveur, aucun compte.

| Route | Ce qu'on y fait |
|---|---|
| `/` | le catalogue : recherche, tri, liste d'objets, facettes à cocher |
| `/r/:ns/:name[/:selector]` | une fiche : historique des commits à gauche, onglets Contenu, Fichier de pipeline, L'utiliser, Couverture à droite |
| `/playground` | lancer un objet ou un regex candidat sur un texte |
| `/playground/compare` | deux à quatre objets sur le même texte |
| `/playground/chat` | l'aller-retour complet, avec un assistant scripté |
| `/contribute` | vérifier un manifeste et ouvrir une pull request |
| `/labels` | les labels que le registre peut émettre, depuis le pied de page |

## Structure, d'après le LangSmith Hub

La disposition reprend celle du [LangSmith Hub](https://smith.langchain.com/hub),
qui distribue des prompts comme ce site distribue des configurations, et dont
les visiteurs de `piighost` connaissent déjà les gestes.

- **Une barre de fil d'Ariane, pas une barre de navigation.** La marque, puis la
  place de la page dans le registre, `piighost / fr-default`. À droite, les deux
  actions qu'un visiteur entreprend, le bac à sable et la contribution, puis
  GitHub, le thème et la langue.
- **Un titre centré et une recherche en pilule.** La page d'accueil est le
  catalogue : un titre, une ligne, un champ de recherche large, et tout de suite
  la liste.
- **Des chips de tri.** Pertinence, mis à jour récemment, les plus utilisés,
  couverture la plus large, nom. Sans requête, l'ordre par défaut est la date de
  mise à jour, la pertinence étant plate.
- **Une liste verticale, pas une grille.** Chaque ligne porte ses pastilles en
  tête (le type, puis les tags), la référence en titre, la description sur deux
  lignes, puis une ligne de métadonnées : date de mise à jour, nombre de labels,
  de commits et d'utilisations. Un bouton « Essayer » à droite mène au bac à
  sable avec l'objet préchargé.
- **Des facettes à cocher avec compteurs**, dans une colonne à droite, groupées
  par famille : type, région, catégorie, métier, cas d'usage, langue. Les
  familles viennent du `kind` du vocabulaire, les auteurs de manifestes ne les
  voient jamais.
- **Une fiche en deux colonnes.** À gauche, l'historique des commits, chaque
  carte portant son hash, ses tags pointeurs et sa date. À droite, le commit
  affiché avec ses pointeurs, puis des onglets : Contenu, Fichier de pipeline,
  L'utiliser, Couverture. La barre de titre porte la référence, les pastilles,
  et trois actions : copier la référence, télécharger, essayer.

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
