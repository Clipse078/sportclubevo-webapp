import { SCE_ACTIONABLE_ERROR_CONTRACT } from "@/lib/design-system/sce-feedback-status-foundation";

export type SceActionableErrorContext =
  | "TOURNAMENT_PLANUNG_LOAD"
  | "TOURNAMENT_PLANUNG_SAVE"
  | "PEOPLE_ACCESS"
  | "COMMUNICATION"
  | "GENERIC";

const DOMAIN_COPY: Record<
  SceActionableErrorContext,
  { title: string; description: string; retryLabel: string }
> = {
  TOURNAMENT_PLANUNG_LOAD: {
    title: "Die Turnierplanung konnte nicht geladen werden.",
    description: "Bitte erneut versuchen. Wenn das Problem bleibt, später nochmals öffnen.",
    retryLabel: "Erneut versuchen",
  },
  TOURNAMENT_PLANUNG_SAVE: {
    title: "Die Turnierplanung konnte nicht gespeichert werden.",
    description: "Prüfen Sie die Eingaben und versuchen Sie es erneut.",
    retryLabel: "Erneut speichern",
  },
  PEOPLE_ACCESS: {
    title: "Personen konnten nicht geladen werden.",
    description: "Bitte erneut versuchen.",
    retryLabel: "Erneut laden",
  },
  COMMUNICATION: {
    title: "Kommunikation konnte nicht geladen werden.",
    description: "Bitte erneut versuchen.",
    retryLabel: "Erneut versuchen",
  },
  GENERIC: {
    title: "Ein Fehler ist aufgetreten.",
    description: "Bitte erneut versuchen.",
    retryLabel: "Erneut versuchen",
  },
};

export function buildSceActionableErrorPresentation(input: {
  context: SceActionableErrorContext;
  serverMessage?: string | null;
  allowServerMessage?: boolean;
}): {
  title: string;
  description: string;
  retryLabel: string;
  usedGenericInternalFallback: boolean;
} {
  const base = DOMAIN_COPY[input.context];
  const raw = input.serverMessage?.trim();
  const genericInternal =
    !raw ||
    raw === SCE_ACTIONABLE_ERROR_CONTRACT.GENERIC_INTERNAL_ERROR_FALLBACK ||
    raw === "Interner Fehler.";

  if (input.allowServerMessage && raw && !genericInternal) {
    return {
      title: base.title,
      description: raw,
      retryLabel: base.retryLabel,
      usedGenericInternalFallback: false,
    };
  }

  return {
    title: base.title,
    description: base.description,
    retryLabel: base.retryLabel,
    usedGenericInternalFallback: genericInternal,
  };
}
