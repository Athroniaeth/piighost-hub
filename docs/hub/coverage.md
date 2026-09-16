# Couverture

*[English version](en/coverage.md).*

Contre quoi ce registre se mesure, et ce que la mesure ne dit pas.

Un registre de motifs écrit par ses auteurs finit par couvrir ce que ses
auteurs connaissent. Cette page compare ses labels aux inventaires publiés par
des gens qui n'ont pas les mêmes angles morts, et garde la comparaison
reproductible :

```bash
python3 scripts/coverage_report.py          # HUB_INVENTORIES pointe le dossier des inventaires
```

## Les sources

| Source | Types | Ce que c'est |
|---|---|---|
| Microsoft Purview | 325 | les types d'information sensible de la suite Microsoft 365 |
| Google Cloud DLP | 261 | les infoTypes de Sensitive Data Protection, dont une longue série par pays |
| Nightfall | 179 | un service commercial de DLP, catalogue public |
| AWS Macie | 167 | les identifiants de données gérés, plus les types PII de Comprehend |
| Cloudflare DLP | 143 | les profils prédéfinis, y compris des entrées orientées prompts d'IA |
| Microsoft Presidio | ~50 | les reconnaisseurs prédéfinis, le seul inventaire dont le code est lisible |
| AI4Privacy | 56 et 20 | les jeux de labels de deux corpus d'entraînement à la dé-identification |

Les quatre premiers sont des catalogues commerciaux : leur existence prouve
qu'un client a payé pour ces formes, ce qui est un signal de fréquence réelle.
Presidio est le seul dont on peut lire le regex et donc juger la qualité.
AI4Privacy donne des labels de corpus, pas des motifs.

## Ce que la comparaison dit

Le rapprochement se fait sur un couple (pays, concept) plutôt que sur un nom,
puisque la même chose s'appelle `FRANCE_CNI`, `FR_CNI` ou
`France identity card` selon le fournisseur.

Un chiffre y résiste mal à l'interprétation, alors voici ce qu'il faut en
retenir plutôt qu'un pourcentage :

- **Le permis de conduire est le manque le mieux étayé.** Les cinq sources le
  portent, pour une douzaine de pays. C'est le premier à écrire.
- **Le code BIC/SWIFT** apparaît dans cinq sources et manquait ici, alors que
  sa forme est propre et sans ambiguïté.
- **Les pays les plus cités que le registre ignore** sont le Japon, l'Irlande,
  la Corée, l'Indonésie, l'Autriche, la Finlande et le Portugal.
- **Le passeport** est porté partout, pays par pays, et le registre n'en avait
  qu'un, l'américain.

## Ce que la comparaison ne dit pas

Une bonne partie de ce que ces catalogues appellent PII n'a aucune forme. Un
nom, un âge, une adresse postale en toutes lettres, une origine ethnique, une
opinion politique, un diagnostic : aucun regex ne les trouve, et prétendre le
contraire produirait un motif qui signale tout. Ces catégories relèvent du
détecteur NER ou LLM, que `piighost` branche à côté du détecteur regex, pas de
ce registre.

Une autre partie dépend de mots-clés de contexte ou d'une somme de contrôle que
ce registre refuse par principe, puisqu'une valeur abîmée par l'OCR doit rester
détectée plutôt que rejetée. Un fournisseur qui annonce mille types compte donc
autre chose que ce qui est compté ici.

Enfin, la couverture n'est pas la qualité. Deux motifs pour un même pays valent
mieux que six qui se disputent le même span, et le contrôle de composition du
registre refuse la publication dans ce cas, ce qu'aucun de ces catalogues ne
fait.

## Comment l'utiliser

Le rapport classe les manques par le nombre de sources indépendantes qui les
portent. Un manque cité par quatre fournisseurs sur cinq mérite d'être écrit,
un manque cité par un seul mérite une question : est-ce une forme réelle, ou la
spécialité d'un catalogue.
