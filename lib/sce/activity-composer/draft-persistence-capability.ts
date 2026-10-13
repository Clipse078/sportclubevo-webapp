import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityCreateValidationResult } from "./types";

export const SCE_ACTIVITY_CREATE_SAVE_NEW_DRAFT_LABEL = "Als Entwurf speichern";
export const SCE_ACTIVITY_CREATE_SAVE_EXISTING_DRAFT_LABEL = "Änderungen speichern";

export type SceActivityCreateDraftSaveOutcome<TDraftResult = unknown> =
  | { ok: true; result: TDraftResult; draftId: string }
  | { ok: false; error: string };

/**
 * Domain-neutral draft persistence contract (01B-R2 foundation).
 * Real Training/Match/Tournament/Club Event persistence belongs to 01C+ adoption.
 */
export type SceActivityCreateDraftPersistenceCapability<
  TDraft,
  TDraftResult = { draftId: string },
  TTabId extends ContextTabId = ContextTabId,
> = {
  /** When omitted on the definition, draft save is not offered. */
  supportsDraftPersistence: true;
  saveNewDraftLabel?: string;
  saveExistingDraftLabel?: string;
  validateDraftForSave: (draft: TDraft) => SceActivityCreateValidationResult<TTabId>;
  saveDraft: (input: {
    draft: TDraft;
    draftId?: string;
  }) => Promise<SceActivityCreateDraftSaveOutcome<TDraftResult>>;
};

/** Persisted draft resume — in-memory/API hydration is domain-owned (01C+). */
export type SceActivityCreateResumeDraft<TDraft> = {
  draftId: string;
  baselineDraft: TDraft;
};

/**
 * Destructive draft deletion is intentionally not part of the canonical footer.
 * Domains expose discard/delete via separate confirmed commands (01C+).
 */
export const SCE_ACTIVITY_CREATE_DRAFT_DELETION_NOT_IN_FOOTER =
  "Persisted drafts are not deleted from the canonical composer footer; use a separate destructive command with confirmation.";
