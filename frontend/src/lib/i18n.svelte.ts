/**
 * Two languages, one dictionary, no dependency.
 *
 * The registry is bilingual down to each manifest, so the site has to be too.
 * A missing key falls back to English rather than rendering the key itself.
 * Copy follows the studio's rules: no em-dash, correct French accents.
 */

export type Locale = "en" | "fr";

const STORAGE_KEY = "piighost-hub-locale";

const STRINGS = {
  en: {
    "nav.catalogue": "Catalogue",
    "nav.playground": "Playground",
    "nav.contribute": "Contribute",
    "nav.github": "GitHub",
    "nav.theme": "Toggle theme",
    "nav.language": "Change language",
    "nav.skip": "Skip to content",

    "home.title": "piighost hub",
    "home.lede":
      "Explore and contribute tested de-identification patterns and configurations for piighost.",
    "home.search": "Search patterns, groups, configurations, labels, tags...",
    "home.all": "All",
    "home.patterns": "Patterns",
    "home.groups": "Groups",
    "home.configs": "Configurations",
    "home.results": "results",
    "home.empty": "Nothing matches these filters.",
    "home.clear": "Clear",
    "home.usedBy": "used by",
    "home.tryIt": "Try it",
    "home.updated": "Updated",
    "home.never": "unrecorded",
    "home.labelsCount": "labels",
    "home.commitsCount": "commits",
    "home.usedCount": "uses",
    "home.sort": "Sort",
    "home.sort.relevance": "Relevance",
    "home.sort.updated": "Recently updated",
    "home.sort.used": "Most used",
    "home.sort.labels": "Widest coverage",
    "home.sort.name": "Name",
    "home.page": "Page",
    "home.previous": "Previous",
    "home.next": "Next",
    "facet.type": "Type",
    "facet.more": "Show more",
    "facet.less": "Show less",
    "facet.region": "Region",
    "facet.category": "Category",
    "facet.domain": "Domain",
    "facet.use-case": "Use case",
    "facet.language": "Language",
    "detail.content": "Content",
    "detail.history": "Commit history",
    "detail.copyRef": "Copy the reference",
    "detail.tryIt": "Try it",
    "detail.unrecorded": "unrecorded head",

    "kind.pattern": "pattern",
    "kind.group": "group",
    "kind.config": "configuration",

    "pick.filter": "Filter by name, label or tag",
    "pick.coverage": "labels covered",
    "pick.none": "Nothing matches.",

    "detail.openPlayground": "Open in the playground",
    "detail.download": "Download TOML",
    "detail.pipeline": "Pipeline file",
    "detail.flattened": "Inlined",
    "detail.referenced": "References",
    "detail.memory": "Memory",
    "detail.none": "none",
    "detail.use": "Use it",
    "detail.export": "Export",
    "detail.commits": "Commits",
    "detail.pattern": "Pattern",
    "detail.engine": "Python re, ASCII",
    "detail.matches": "Must match",
    "detail.noMatches": "Must not match",
    "detail.sources": "Sources",
    "detail.sourcesNote":
      "Insertion order. On an identical span the first source wins.",
    "detail.labels": "Labels",
    "detail.detectors": "Detectors",
    "detail.stages": "Stages",
    "detail.from": "from",
    "detail.excluded": "excluded",
    "detail.only": "only",

    "play.run": "Run",
    "play.compare": "Compare",
    "play.chat": "Chat",
    "play.configure": "Configure",
    "play.text": "Text",
    "play.results": "Results",
    "play.object": "Object",
    "play.candidate": "Regex",
    "play.candidateNote":
      "Not in the registry. Runs in a separate process, killed after two seconds.",
    "play.regexPlaceholder": "A regex to try",
    "play.sample": "Load a sample",
    "play.go": "Run",
    "play.running": "Running",
    "play.input": "Input",
    "play.anonymized": "De-identified",
    "play.legend":
      "Colours follow the label, from your text to the tokens and back.",
    "play.edit": "Edit",
    "play.kept": "kept",
    "play.dropped": "Dropped",
    "play.lostTo": "lost to",
    "play.elapsed": "ms",
    "play.truncated": "Text cut to the playground limit.",
    "play.unsupported": "Not run here, needs a model:",
    "play.empty": "Run to see detections.",
    "play.nothing": "No detection.",
    "play.privacy":
      "Your text is not written to any database. It is de-identified to answer this request, then forgotten.",

    "compare.add": "Add",
    "compare.remove": "Remove",
    "compare.agreed": "Caught by all",
    "compare.disputed": "Caught by some",
    "compare.go": "Compare",

    "chat.lede":
      "Your message is de-identified before the assistant sees it; the reply is restored before you read it. The assistant is scripted, so the demo is free and reproducible.",
    "chat.send": "Send",
    "chat.placeholder": "A message with an email or a phone number",
    "chat.reveal": "Show what the model sees",
    "chat.reset": "Reset",
    "chat.mapping": "Tokens",
    "chat.empty": "Send a message to start.",

    "draft.form": "Form",
    "draft.toml": "TOML",
    "draft.identity": "Identity",
    "draft.name": "Name",
    "draft.label": "Label",
    "draft.tags": "Tags",
    "draft.tagFilter": "Filter the vocabulary",
    "draft.tagRemove": "Remove this tag",
    "draft.regex": "Regex",
    "draft.regexNote":
      "Python re, compiled with re.ASCII. Avoid the single quote: it closes the TOML literal string the manifest writes it in.",
    "draft.description": "Description",
    "draft.examples": "Examples",
    "draft.matches": "Must be caught",
    "draft.matchText": "A sentence",
    "draft.matchValue": "The value in it",
    "draft.noMatches": "Must be left alone",
    "draft.add": "Add a row",
    "draft.remove": "Remove",
    "draft.redos": "Backtracking recipe",
    "draft.redosNote":
      "A valid prefix, an ambiguous fragment repeated to 100,000 characters, then an ending that forbids the match. This is what bounds the regex against a hostile text.",
    "draft.prefix": "Prefix",
    "draft.filler": "Filler",
    "draft.suffix": "Suffix",
    "draft.ok": "Caught as expected",
    "draft.nothing": "nothing caught",
    "draft.preview": "Generated manifest",
    "draft.sources": "Sources",
    "draft.source": "Source",
    "draft.sourcesNote":
      "In order. On two identical spans the first source declared wins, so moving a row changes which label a value comes out under.",
    "draft.addSource": "Add a source",
    "draft.exclude": "Leave out of this source",
    "draft.moveUp": "Move up",
    "draft.moveDown": "Move down",
    "draft.name.kebab": "The name is lower case words joined by dashes.",
    "draft.label.snake": "The label is upper case words joined by underscores.",
    "draft.tags.empty": "Pick at least one tag.",
    "draft.regex.empty": "Write the regex.",
    "draft.regex.quote":
      "The regex holds a single quote, which the manifest cannot carry.",
    "draft.description.empty.en": "The English description is required.",
    "draft.description.empty.fr": "The French description is required.",
    "draft.description.dash":
      "Replace the em-dash with a comma or a full stop.",
    "draft.matches.two": "Two sentences that must be caught are required.",
    "draft.match.incomplete":
      "A row needs both a sentence and the value inside it.",
    "draft.match.once": "The value has to appear exactly once in its sentence.",
    "draft.noMatches.two":
      "Two sentences that must be left alone are required.",
    "draft.redos.incomplete": "The filler and the suffix are required.",
    "draft.sources.one": "A group needs at least one source.",
    "draft.sources.twice": "The same source is listed twice.",
    "contribute.lede":
      "Propose a pattern, a group or a configuration. Checked here, merged by pull request.",
    "contribute.what": "What are you proposing?",
    "contribute.pattern.note": "One shape and the label it emits.",
    "contribute.group.note": "A reusable set of patterns.",
    "contribute.config.note": "A pipeline you can run as it is.",
    "contribute.kind": "Kind",
    "contribute.namespace": "Namespace",
    "contribute.name": "Name",
    "contribute.manifest": "Manifest",
    "contribute.start": "Starting point",
    "contribute.base": "Base object",
    "contribute.blank": "Blank manifest",
    "contribute.fork": "Start from this one",
    "contribute.fork.pattern":
      "Copies the manifest under your name. Edit the regex and the examples.",
    "contribute.fork.group":
      "References it as a source, so it keeps improving under you.",
    "contribute.fork.config":
      "Extends it, so you only write down what differs.",
    "contribute.fork.draft":
      "Fills the form with it, examples included. Change the shape and keep the cases it already gets right.",
    "contribute.check": "Check",
    "contribute.path": "Path",
    "contribute.ok": "Every check passed.",
    "contribute.openPr": "Open the pull request",
    "contribute.findings": "Findings",
    "contribute.empty": "Check to see the findings.",

    "stats.title": "Usage",
    "stats.lede": "What the registry is asked for, counted rather than logged.",
    "stats.window": "Window",
    "stats.7": "7 days",
    "stats.30": "30 days",
    "stats.90": "90 days",
    "stats.pulls": "pipelines pulled",
    "stats.browses": "objects looked at",
    "stats.searches": "searches",
    "stats.perDay": "Pulls per day",
    "stats.top": "Most pulled",
    "stats.selectors": "Pinned or floating",
    "stats.selectorsNote":
      "A commit is pinned and reproducible. A tag follows what its owner moves. The bare name follows the head.",
    "stats.clients": "Who is asking",
    "stats.privacy":
      "These are counters, not a log. The finest resolution is the hour, a row is a shape rather than a request, and no address, browser identity or text is recorded anywhere.",

    "labels.title": "Labels",
    "labels.lede":
      "Every label this registry can emit, and the pattern that defines it.",
    "labels.definedBy": "defined by",

    "common.loading": "Loading",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.notFound": "Nothing here",
    "common.notFoundLede": "That page does not exist.",
    "common.back": "Back to the catalogue",
    "common.copy": "Copy",
    "common.copied": "Copied",

    "footer.tagline":
      "Tested, versioned de-identification configurations for piighost.",
    "footer.links": "Links",
    "footer.docs": "Documentation",
    "footer.mit": "MIT license.",
  },
  fr: {
    "nav.catalogue": "Catalogue",
    "nav.playground": "Bac à sable",
    "nav.contribute": "Contribuer",
    "nav.github": "GitHub",
    "nav.theme": "Changer de thème",
    "nav.language": "Changer de langue",
    "nav.skip": "Aller au contenu",

    "home.title": "piighost hub",
    "home.lede":
      "Explorez et proposez des motifs et des configurations de dé-identification testés pour piighost.",
    "home.search":
      "Chercher un motif, un groupe, une configuration, un label, un tag...",
    "home.all": "Tout",
    "home.patterns": "Motifs",
    "home.groups": "Groupes",
    "home.configs": "Configurations",
    "home.results": "résultats",
    "home.empty": "Rien ne correspond à ces filtres.",
    "home.clear": "Effacer",
    "home.usedBy": "utilisé par",
    "home.tryIt": "Essayer",
    "home.updated": "Mis à jour",
    "home.never": "non enregistré",
    "home.labelsCount": "labels",
    "home.commitsCount": "commits",
    "home.usedCount": "usages",
    "home.sort": "Trier",
    "home.sort.relevance": "Pertinence",
    "home.sort.updated": "Mis à jour récemment",
    "home.sort.used": "Les plus utilisés",
    "home.sort.labels": "Couverture la plus large",
    "home.sort.name": "Nom",
    "home.page": "Page",
    "home.previous": "Précédent",
    "home.next": "Suivant",
    "facet.type": "Type",
    "facet.more": "Voir plus",
    "facet.less": "Voir moins",
    "facet.region": "Région",
    "facet.category": "Catégorie",
    "facet.domain": "Métier",
    "facet.use-case": "Cas d'usage",
    "facet.language": "Langue",
    "detail.content": "Contenu",
    "detail.history": "Historique des commits",
    "detail.copyRef": "Copier la référence",
    "detail.tryIt": "Essayer",
    "detail.unrecorded": "tête non enregistrée",

    "kind.pattern": "motif",
    "kind.group": "groupe",
    "kind.config": "configuration",

    "pick.filter": "Filtrer par nom, label ou tag",
    "pick.coverage": "labels couverts",
    "pick.none": "Aucun résultat.",

    "detail.openPlayground": "Ouvrir dans le bac à sable",
    "detail.download": "Télécharger le TOML",
    "detail.pipeline": "Fichier de pipeline",
    "detail.flattened": "Inliné",
    "detail.referenced": "Références",
    "detail.memory": "Mémoire",
    "detail.none": "aucune",
    "detail.use": "L'utiliser",
    "detail.export": "Exporter",
    "detail.commits": "Commits",
    "detail.pattern": "Motif",
    "detail.engine": "Python re, ASCII",
    "detail.matches": "Doit reconnaître",
    "detail.noMatches": "Ne doit pas reconnaître",
    "detail.sources": "Sources",
    "detail.sourcesNote":
      "Ordre d'insertion. Sur un span identique, la première source l'emporte.",
    "detail.labels": "Labels",
    "detail.detectors": "Détecteurs",
    "detail.stages": "Étages",
    "detail.from": "vient de",
    "detail.excluded": "exclu",
    "detail.only": "seulement",

    "play.run": "Lancer",
    "play.compare": "Comparer",
    "play.chat": "Chat",
    "play.configure": "Configurer",
    "play.text": "Texte",
    "play.results": "Résultats",
    "play.object": "Objet",
    "play.candidate": "Regex",
    "play.candidateNote":
      "Hors registre. Tourne dans un processus séparé, tué au bout de deux secondes.",
    "play.regexPlaceholder": "Un regex à essayer",
    "play.sample": "Charger un exemple",
    "play.go": "Lancer",
    "play.running": "En cours",
    "play.input": "Saisie",
    "play.anonymized": "Dé-identifié",
    "play.legend":
      "Les couleurs suivent le label, de votre texte aux jetons et retour.",
    "play.edit": "Modifier",
    "play.kept": "gardées",
    "play.dropped": "Écartées",
    "play.lostTo": "au profit de",
    "play.elapsed": "ms",
    "play.truncated": "Texte coupé à la limite du bac à sable.",
    "play.unsupported": "Non exécuté ici, demande un modèle :",
    "play.empty": "Lancez pour voir les détections.",
    "play.nothing": "Aucune détection.",
    "play.privacy":
      "Votre texte n'est enregistré dans aucune base. Il est dé-identifié pour répondre à cette requête, puis oublié.",

    "compare.add": "Ajouter",
    "compare.remove": "Retirer",
    "compare.agreed": "Reconnu par tous",
    "compare.disputed": "Reconnu par certains",
    "compare.go": "Comparer",

    "chat.lede":
      "Votre message est dé-identifié avant que l'assistant le voie ; la réponse est restaurée avant que vous la lisiez. L'assistant est scripté, donc la démo est gratuite et reproductible.",
    "chat.send": "Envoyer",
    "chat.placeholder": "Un message avec un e-mail ou un téléphone",
    "chat.reveal": "Voir ce que le modèle voit",
    "chat.reset": "Recommencer",
    "chat.mapping": "Jetons",
    "chat.empty": "Envoyez un message pour commencer.",

    "draft.form": "Formulaire",
    "draft.toml": "TOML",
    "draft.identity": "Identité",
    "draft.name": "Nom",
    "draft.label": "Label",
    "draft.tags": "Tags",
    "draft.tagFilter": "Filtrer le vocabulaire",
    "draft.tagRemove": "Retirer ce tag",
    "draft.regex": "Regex",
    "draft.regexNote":
      "Python re, compilé avec re.ASCII. Évitez l'apostrophe droite : elle ferme la chaîne littérale TOML dans laquelle le manifeste l'écrit.",
    "draft.description": "Description",
    "draft.examples": "Exemples",
    "draft.matches": "Doit être reconnu",
    "draft.matchText": "Une phrase",
    "draft.matchValue": "La valeur qu'elle contient",
    "draft.noMatches": "Ne doit rien reconnaître",
    "draft.add": "Ajouter une ligne",
    "draft.remove": "Retirer",
    "draft.redos": "Recette de backtracking",
    "draft.redosNote":
      "Un préfixe valide, un fragment ambigu répété jusqu'à 100 000 caractères, puis une fin qui interdit la correspondance. C'est ce qui borne le regex face à un texte hostile.",
    "draft.prefix": "Préfixe",
    "draft.filler": "Remplissage",
    "draft.suffix": "Fin",
    "draft.ok": "Reconnu comme prévu",
    "draft.nothing": "rien reconnu",
    "draft.preview": "Manifeste généré",
    "draft.sources": "Sources",
    "draft.source": "Source",
    "draft.sourcesNote":
      "Dans l'ordre. Sur deux spans identiques, la première source déclarée gagne, donc déplacer une ligne change le label sous lequel une valeur ressort.",
    "draft.addSource": "Ajouter une source",
    "draft.exclude": "Écarter de cette source",
    "draft.moveUp": "Monter",
    "draft.moveDown": "Descendre",
    "draft.name.kebab":
      "Le nom s'écrit en minuscules, les mots reliés par des tirets.",
    "draft.label.snake":
      "Le label s'écrit en majuscules, les mots reliés par des tirets bas.",
    "draft.tags.empty": "Choisissez au moins un tag.",
    "draft.regex.empty": "Écrivez le regex.",
    "draft.regex.quote":
      "Le regex contient une apostrophe droite, que le manifeste ne peut pas porter.",
    "draft.description.empty.en": "La description anglaise est obligatoire.",
    "draft.description.empty.fr": "La description française est obligatoire.",
    "draft.description.dash":
      "Remplacez le tiret cadratin par une virgule ou un point.",
    "draft.matches.two":
      "Deux phrases qui doivent être reconnues sont nécessaires.",
    "draft.match.incomplete":
      "Une ligne demande une phrase et la valeur qu'elle contient.",
    "draft.match.once":
      "La valeur doit apparaître exactement une fois dans sa phrase.",
    "draft.noMatches.two":
      "Deux phrases qui ne doivent rien déclencher sont nécessaires.",
    "draft.redos.incomplete": "Le remplissage et la fin sont obligatoires.",
    "draft.sources.one": "Un groupe demande au moins une source.",
    "draft.sources.twice": "La même source est listée deux fois.",
    "contribute.lede":
      "Proposez un motif, un groupe ou une configuration. Vérifié ici, fusionné par pull request.",
    "contribute.what": "Que proposez-vous ?",
    "contribute.pattern.note": "Un motif et le label qu'il produit.",
    "contribute.group.note": "Un ensemble de motifs réutilisable.",
    "contribute.config.note": "Une chaîne de traitement prête à tourner.",
    "contribute.kind": "Type",
    "contribute.namespace": "Espace de noms",
    "contribute.name": "Nom",
    "contribute.manifest": "Manifeste",
    "contribute.start": "Point de départ",
    "contribute.base": "Objet de base",
    "contribute.blank": "Manifeste vierge",
    "contribute.fork": "Partir de celui-ci",
    "contribute.fork.pattern":
      "Copie le manifeste sous votre nom. Modifiez le regex et les exemples.",
    "contribute.fork.group":
      "Le référence comme source : il continue de s'améliorer sous vous.",
    "contribute.fork.config": "L'étend : vous n'écrivez que ce qui change.",
    "contribute.check": "Vérifier",
    "contribute.path": "Chemin",
    "contribute.ok": "Tous les contrôles passent.",
    "contribute.openPr": "Ouvrir la pull request",
    "contribute.findings": "Constats",
    "contribute.empty": "Vérifiez pour voir les constats.",

    "stats.title": "Usage",
    "stats.lede": "Ce qu'on demande au registre, compté et non journalisé.",
    "stats.window": "Fenêtre",
    "stats.7": "7 jours",
    "stats.30": "30 jours",
    "stats.90": "90 jours",
    "stats.pulls": "pipelines récupérés",
    "stats.browses": "objets consultés",
    "stats.searches": "recherches",
    "stats.perDay": "Récupérations par jour",
    "stats.top": "Les plus récupérés",
    "stats.selectors": "Épinglé ou flottant",
    "stats.selectorsNote":
      "Un commit est épinglé et reproductible. Un tag suit ce que son propriétaire déplace. Le nom nu suit la tête.",
    "stats.clients": "Qui demande",
    "stats.privacy":
      "Ce sont des compteurs, pas un journal. La résolution la plus fine est l'heure, une ligne est une forme et non une requête, et aucune adresse, aucune identité de navigateur, aucun texte n'est enregistré nulle part.",

    "labels.title": "Labels",
    "labels.lede":
      "Tous les labels que ce registre peut émettre, et le motif qui les définit.",
    "labels.definedBy": "défini par",

    "common.loading": "Chargement",
    "common.error": "Quelque chose a échoué",
    "common.retry": "Réessayer",
    "common.notFound": "Rien ici",
    "common.notFoundLede": "Cette page n'existe pas.",
    "common.back": "Retour au catalogue",
    "common.copy": "Copier",
    "common.copied": "Copié",

    "footer.tagline":
      "Des configurations de dé-identification testées et versionnées pour piighost.",
    "footer.links": "Liens",
    "footer.docs": "Documentation",
    "footer.mit": "Licence MIT.",
  },
} as const;

export type Key = keyof (typeof STRINGS)["en"];

function initial(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

class I18n {
  locale = $state<Locale>(initial());

  set(next: Locale) {
    this.locale = next;
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  t(key: Key): string {
    const table = STRINGS[this.locale] as Record<string, string>;
    return table[key] ?? STRINGS.en[key] ?? key;
  }

  /** Pick the right side of a `{ en, fr }` pair coming from the registry. */
  pick(text: { en: string; fr: string } | null | undefined): string {
    if (!text) return "";
    return this.locale === "fr" ? text.fr : text.en;
  }
}

export const i18n = new I18n();
export const t = (key: Key) => i18n.t(key);
