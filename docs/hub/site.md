# Le site

Une application Svelte servie par nginx, qui parle à l'API sous `/api/v1` en
origine unique. Neuf routes, aucun état côté serveur, aucun compte.

| Route | Ce qu'on y fait |
|---|---|
| `/` | chercher, et partir d'une configuration |
| `/browse` | parcourir avec des facettes ; les filtres sont dans l'URL |
| `/r/:ns/:name[/:selector]` | une fiche d'objet |
| `/labels` | les labels que le registre peut émettre |
| `/playground` | lancer un objet sur un texte, ou essayer un regex |
| `/compare` | deux à quatre objets sur le même texte |
| `/chat` | l'aller-retour complet, avec un assistant scripté |
| `/submit` | vérifier un manifeste et ouvrir une pull request |

## Choix qui se voient

**Les filtres vivent dans l'URL.** Une vue filtrée doit être partageable, et le
bouton retour doit défaire un filtre plutôt que quitter la page. `/browse` lit
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

**Les surlignages ne reposent pas que sur la couleur.** Chaque détection porte
une teinte *et* un soulignement, et la teinte est choisie en hachant le label,
donc un label garde sa couleur d'une page à l'autre.

**Une fiche imprimable.** La classe `no-print` retire les contrôles, et la
feuille bascule en noir sur blanc. Un DPO lit une fiche de couverture sur
papier, pas un fichier TOML.

**Un routeur en un fichier.** Neuf routes, pas de layouts imbriqués : une
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
