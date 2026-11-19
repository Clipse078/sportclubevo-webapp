import type { ClubMeldungCategory, ClubMeldungStatus } from "@prisma/client";

export const CLUB_MELDUNG_CATEGORY_LABELS: Record<ClubMeldungCategory, string> = {
  DAMAGE_OR_PROBLEM: "Schaden oder Problem",
  QUESTION_OR_SUPPORT: "Frage oder Unterstützung",
  IDEA_OR_IMPROVEMENT: "Idee oder Verbesserung",
  OTHER: "Sonstiges",
};

export const CLUB_MELDUNG_STATUS_LABELS: Record<ClubMeldungStatus, string> = {
  RECEIVED: "Eingegangen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING: "Wartet",
  DONE: "Erledigt",
};

export const CLUB_MELDUNG_WORKSPACE_COPY = {
  moduleTitle: "Anliegen & Meldungen",
  pageSubtitle:
    "Meldungen aufnehmen, Zuständigkeiten klären und den Fortschritt nachvollziehbar dokumentieren.",
  reporterPortalTitle: "Anliegen melden",
  reporterListTitle: "Meine Meldungen",
  internalViews: {
    mine: "Meine Zuständigkeiten",
    unassigned: "Ohne Zuständigkeit",
    all: "Alle Meldungen",
  },
  emailNotActivatedNote:
    "E-Mail-Kanal ist in dieser Umgebung nicht aktiviert. Meldungen werden über Web und API aufgenommen.",
  visibilityNote:
    "Vertrauliche Beschwerden erscheinen nicht automatisch in einer breiten Betriebswarteschlange. Zugriff erfolgt nur für berechtigte Personen mit expliziter Rolle.",
  attachmentLifecycleNote:
    "Fall-Anhänge nur bei der Erstellung. Interne Notizen unterstützen keine Anhänge. Nicht verknüpfte Uploads (STAGED/READY) werden nach SCE-COMM-EVO-09 nach spätestens 7 Tagen bereinigt, sofern sie an keiner Meldung hängen.",
} as const;