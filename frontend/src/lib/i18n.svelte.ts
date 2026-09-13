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

    "home.title": "Ready-made de-identification for piighost",
    "home.lede":
      "Tested regex patterns, groups and pipeline configurations, versioned by content and pinnable by tag. Load one with a short reference instead of writing it again.",
    "home.search": "Search patterns, groups and configurations",
    "home.all": "All",
    "home.patterns": "Patterns",
    "home.groups": "Groups",
    "home.configs": "Configurations",
    "home.results": "results",
    "home.empty": "Nothing matches these filters.",
    "home.clear": "Clear",
    "home.usedBy": "used by",

    "kind.pattern": "pattern",
    "kind.group": "group",
    "kind.config": "configuration",

    "detail.openPlayground": "Open in the playground",
    "detail.download": "Download TOML",
    "detail.pipeline": "Pipeline file",
    "detail.flattened": "Inlined",
    "detail.referenced": "References",
    "detail.memory": "Memory",
    "detail.none": "none",
    "detail.use": "Use it",
    "detail.export": "Export",
    "detail.coverage": "Coverage",
    "detail.commits": "Commits",
    "detail.diff": "Compare",
    "detail.diffNone": "No change on the corpus.",
    "detail.noCoverage": "No annotated sample covers this object yet.",
    "detail.scopeLabels":
      "Over the values annotated with labels this object emits.",
    "detail.scopeCorpus": "Over every annotated value of the corpus.",
    "detail.scoreHelp":
      "Measured on this registry's own samples: coverage of those texts, not a grade.",
    "detail.exact": "caught, expected label",
    "detail.mislabelled": "caught, other label",
    "detail.missed": "left in clear",
    "detail.extra": "extra spans",
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
    "play.anonymized": "Anonymized",
    "play.edit": "Edit",
    "play.kept": "kept",
    "play.dropped": "Dropped",
    "play.lostTo": "lost to",
    "play.elapsed": "ms",
    "play.truncated": "Text cut to the playground limit.",
    "play.unsupported": "Not run here, needs a model:",
    "play.empty": "Run to see detections.",
    "play.nothing": "No detection.",
    "play.privacy": "Nothing is stored. The text lives only in this request.",

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

    "contribute.lede":
      "Publishing is a pull request against the registry. Check your manifest here with the same tests the maintainers run.",
    "contribute.kind": "Kind",
    "contribute.namespace": "Namespace",
    "contribute.name": "Name",
    "contribute.manifest": "Manifest",
    "contribute.example": "Load an example",
    "contribute.check": "Check",
    "contribute.path": "Path",
    "contribute.ok": "Every check passed.",
    "contribute.openPr": "Open the pull request",
    "contribute.findings": "Findings",
    "contribute.empty": "Check to see the findings.",

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

    "home.title": "De la dé-identification prête à l'emploi pour piighost",
    "home.lede":
      "Des motifs regex, des groupes et des configurations de pipeline, testés, versionnés par leur contenu et épinglables par tag. Chargez-en un avec une référence courte au lieu de le réécrire.",
    "home.search": "Chercher un motif, un groupe, une configuration",
    "home.all": "Tout",
    "home.patterns": "Motifs",
    "home.groups": "Groupes",
    "home.configs": "Configurations",
    "home.results": "résultats",
    "home.empty": "Rien ne correspond à ces filtres.",
    "home.clear": "Effacer",
    "home.usedBy": "utilisé par",

    "kind.pattern": "motif",
    "kind.group": "groupe",
    "kind.config": "configuration",

    "detail.openPlayground": "Ouvrir dans le bac à sable",
    "detail.download": "Télécharger le TOML",
    "detail.pipeline": "Fichier de pipeline",
    "detail.flattened": "Inliné",
    "detail.referenced": "Références",
    "detail.memory": "Mémoire",
    "detail.none": "aucune",
    "detail.use": "L'utiliser",
    "detail.export": "Exporter",
    "detail.coverage": "Couverture",
    "detail.commits": "Commits",
    "detail.diff": "Comparer",
    "detail.diffNone": "Aucun changement sur le corpus.",
    "detail.noCoverage": "Aucun texte annoté ne couvre encore cet objet.",
    "detail.scopeLabels":
      "Sur les valeurs annotées avec les labels que cet objet émet.",
    "detail.scopeCorpus": "Sur toutes les valeurs annotées du corpus.",
    "detail.scoreHelp":
      "Mesuré sur les textes de ce registre : une couverture de ces textes, pas une note.",
    "detail.exact": "reconnues, label attendu",
    "detail.mislabelled": "reconnues, autre label",
    "detail.missed": "laissées en clair",
    "detail.extra": "spans en plus",
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
    "play.anonymized": "Anonymisé",
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
      "Rien n'est stocké. Le texte ne vit que dans cette requête.",

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

    "contribute.lede":
      "Publier passe par une pull request sur le registre. Vérifiez votre manifeste ici avec les mêmes tests que les mainteneurs.",
    "contribute.kind": "Type",
    "contribute.namespace": "Espace de noms",
    "contribute.name": "Nom",
    "contribute.manifest": "Manifeste",
    "contribute.example": "Charger un exemple",
    "contribute.check": "Vérifier",
    "contribute.path": "Chemin",
    "contribute.ok": "Tous les contrôles passent.",
    "contribute.openPr": "Ouvrir la pull request",
    "contribute.findings": "Constats",
    "contribute.empty": "Vérifiez pour voir les constats.",

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
