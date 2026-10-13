/**
 * Explicit UI lifecycle phases for the Activity Composer (01B-R2).
 * Derived from persistence + dirty + in-flight action + error signals.
 */
export type SceActivityComposerLifecyclePhase =
  | "NEW_CLEAN"
  | "NEW_DIRTY"
  | "DRAFT_SAVED"
  | "DRAFT_DIRTY"
  | "SAVING_DRAFT"
  | "SUBMITTING"
  | "SAVE_ERROR"
  | "SUBMIT_ERROR";

export function resolveComposerLifecyclePhase(input: {
  hasPersistedDraft: boolean;
  isDirty: boolean;
  isSavingDraft: boolean;
  isSubmitting: boolean;
  draftSaveError: string | null;
  submitError: string | null;
}): SceActivityComposerLifecyclePhase {
  if (input.isSubmitting) {
    return "SUBMITTING";
  }
  if (input.isSavingDraft) {
    return "SAVING_DRAFT";
  }
  if (input.submitError) {
    return "SUBMIT_ERROR";
  }
  if (input.draftSaveError) {
    return "SAVE_ERROR";
  }
  if (input.hasPersistedDraft) {
    return input.isDirty ? "DRAFT_DIRTY" : "DRAFT_SAVED";
  }
  return input.isDirty ? "NEW_DIRTY" : "NEW_CLEAN";
}

export function resolveComposerPersistenceStatusLabel(
  phase: SceActivityComposerLifecyclePhase,
): string | null {
  switch (phase) {
    case "NEW_CLEAN":
    case "NEW_DIRTY":
      return null;
    case "DRAFT_SAVED":
      return "ENTWURF · Gespeichert";
    case "DRAFT_DIRTY":
    case "SAVE_ERROR":
      return "ENTWURF · Nicht gespeicherte Änderungen";
    case "SAVING_DRAFT":
      return "ENTWURF · Wird gespeichert…";
    case "SUBMITTING":
      return "ENTWURF · Wird erstellt…";
    case "SUBMIT_ERROR":
      return null;
    default:
      return null;
  }
}

/** 01B foundation uses explicit user-triggered persistence only — no server autosave. */
export const SCE_ACTIVITY_COMPOSER_NO_SERVER_AUTOSAVE =
  "01B does not introduce server autosave; draft/create persistence is explicit until domain adoption evaluates recovery.";
