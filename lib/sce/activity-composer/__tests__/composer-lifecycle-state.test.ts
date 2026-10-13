import { describe, expect, it } from "vitest";
import {
  resolveComposerLifecyclePhase,
  resolveComposerPersistenceStatusLabel,
} from "../composer-lifecycle-state";

describe("composer lifecycle state (01B-R2)", () => {
  it("derives NEW vs DRAFT phases from persistence and dirty", () => {
    expect(
      resolveComposerLifecyclePhase({
        hasPersistedDraft: false,
        isDirty: false,
        isSavingDraft: false,
        isSubmitting: false,
        draftSaveError: null,
        submitError: null,
      }),
    ).toBe("NEW_CLEAN");

    expect(
      resolveComposerLifecyclePhase({
        hasPersistedDraft: true,
        isDirty: false,
        isSavingDraft: false,
        isSubmitting: false,
        draftSaveError: null,
        submitError: null,
      }),
    ).toBe("DRAFT_SAVED");
  });

  it("prioritizes in-flight and error phases", () => {
    expect(
      resolveComposerLifecyclePhase({
        hasPersistedDraft: true,
        isDirty: true,
        isSavingDraft: true,
        isSubmitting: false,
        draftSaveError: null,
        submitError: null,
      }),
    ).toBe("SAVING_DRAFT");

    expect(
      resolveComposerLifecyclePhase({
        hasPersistedDraft: true,
        isDirty: true,
        isSavingDraft: false,
        isSubmitting: false,
        draftSaveError: "x",
        submitError: null,
      }),
    ).toBe("SAVE_ERROR");
  });

  it("maps persistence status labels for assistive/header display", () => {
    expect(resolveComposerPersistenceStatusLabel("DRAFT_SAVED")).toContain("Gespeichert");
    expect(resolveComposerPersistenceStatusLabel("DRAFT_DIRTY")).toContain("Nicht gespeicherte");
    expect(resolveComposerPersistenceStatusLabel("SUBMITTING")).toContain("erstellt");
    expect(
      resolveComposerPersistenceStatusLabel("SUBMITTING", { commitIsApprovalSubmission: true }),
    ).toContain("eingereicht");
  });
});
