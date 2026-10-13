import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import type { SceActivityCreateDefinition, SceActivityCreateKind } from "./types";

export type PreviewComposerTabId = "grunddaten" | "details" | "ressourcen" | "validierung";

export type PreviewComposerDraft = {
  title: string;
  notes: string;
  forceValidationError: boolean;
  forceDraftSaveError: boolean;
};

export function buildPreviewTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<PreviewComposerTabId, boolean>>;
}): ContextTabNavigationConfig<PreviewComposerTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: PreviewComposerTabId, label: string) =>
    err[id] ? `${label} •` : label;

  return {
    contextKind: "SCE_ACTIVITY_COMPOSER_PREVIEW",
    defaultTab: "grunddaten",
    tabs: [
      { key: "grunddaten", label: mark("grunddaten", "Grunddaten"), placement: "primary" },
      { key: "details", label: mark("details", "Details"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "validierung", label: mark("validierung", "Validierung"), placement: "primary" },
    ],
  };
}

const PREVIEW_CREATE_LABELS: Record<SceActivityCreateKind, string> = {
  CLUB_EVENT: "Veranstaltung erstellen",
  TRAINING: "Training erstellen",
  MATCH: "Spiel erstellen",
  TOURNAMENT: "Turnier erstellen",
};

export function previewCreateActionLabel(kind: SceActivityCreateKind): string {
  return PREVIEW_CREATE_LABELS[kind];
}

export function createPreviewActivityCreateDefinition(
  activityKind: SceActivityCreateKind,
  tabRenderers: SceActivityCreateDefinition<
    PreviewComposerDraft,
    { id: string },
    PreviewComposerTabId
  >["tabs"],
): SceActivityCreateDefinition<PreviewComposerDraft, { id: string }, PreviewComposerTabId> {
  return {
    activityKind,
    title: "Vorschau — Activity Composer",
    description: "Isolierte 01B-Vorschau ohne Domain-Persistenz.",
    createActionLabel: previewCreateActionLabel(activityKind),
    defaultTab: "grunddaten",
    buildTabNavigationConfig: buildPreviewTabNavigationConfig,
    initialDraft: {
      title: "",
      notes: "",
      forceValidationError: false,
      forceDraftSaveError: false,
    },
    tabs: tabRenderers,
    draftPersistence: {
      supportsDraftPersistence: true,
      validateDraftForSave: () => ({ valid: true, tabErrors: {} }),
      saveDraft: async ({ draft }) => {
        await new Promise((r) => setTimeout(r, 250));
        if (draft.forceDraftSaveError) {
          return {
            ok: false,
            error: "Entwurf konnte nicht gespeichert werden (Vorschau).",
          };
        }
        return { ok: true, result: { draftId: "preview-draft-id" }, draftId: "preview-draft-id" };
      },
    },
    validateDraft: (draft) => {
      const titleMissing = draft.title.trim().length < 3;
      if (!draft.forceValidationError && !titleMissing) {
        return { valid: true, tabErrors: {} };
      }
      const fieldErrors: Record<string, string> = {};
      if (titleMissing) {
        fieldErrors.title = "Titel ist erforderlich (Vorschau).";
      }
      return {
        valid: false,
        tabErrors: {
          grunddaten: titleMissing,
          validierung: draft.forceValidationError,
        },
        fieldErrors,
        firstInvalidTab: titleMissing ? "grunddaten" : "validierung",
      };
    },
    submitDraft: async (draft) => {
      await new Promise((r) => setTimeout(r, 400));
      if (draft.forceValidationError) {
        return { ok: false, error: "Simulierter API-Fehler (Vorschau)." };
      }
      return { ok: true, result: { id: "preview-local-id" } };
    },
  };
}
