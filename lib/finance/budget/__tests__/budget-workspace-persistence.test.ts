import { describe, expect, it } from "vitest";
import {
  countFailedBudgetLineSaves,
  deriveBudgetWorkspacePersistencePhase,
} from "@/lib/finance/budget/budget-workspace-persistence";
import { isStaleBudgetSaveResult } from "@/lib/finance/budget/budget-draft-editing";

describe("FIN-02A R2 budget workspace persistence feedback", () => {
  it("derives UNSAVED when local edits exist without in-flight saves", () => {
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: 2,
        inFlightSaveCount: 0,
        failedLineSaveCount: 0,
      }),
    ).toBe("unsaved");
  });

  it("derives SAVING while line mutations are pending", () => {
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: 1,
        inFlightSaveCount: 1,
        failedLineSaveCount: 0,
      }),
    ).toBe("saving");
  });

  it("derives SAVED when nothing is dirty or in flight", () => {
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: 0,
        inFlightSaveCount: 0,
        failedLineSaveCount: 0,
      }),
    ).toBe("saved");
  });

  it("derives ERROR when a line save failed and hides when read-only", () => {
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: 1,
        inFlightSaveCount: 0,
        failedLineSaveCount: 1,
      }),
    ).toBe("error");
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: false,
        dirtyAccountCount: 3,
        inFlightSaveCount: 2,
        failedLineSaveCount: 1,
      }),
    ).toBe("hidden");
  });

  it("returns to UNSAVED after a successful save when the user edits again", () => {
    const afterSave = deriveBudgetWorkspacePersistencePhase({
      editable: true,
      dirtyAccountCount: 0,
      inFlightSaveCount: 0,
      failedLineSaveCount: 0,
    });
    expect(afterSave).toBe("saved");

    const afterNewEdit = deriveBudgetWorkspacePersistencePhase({
      editable: true,
      dirtyAccountCount: 1,
      inFlightSaveCount: 0,
      failedLineSaveCount: 0,
    });
    expect(afterNewEdit).toBe("unsaved");
  });

  it("simulates blur save lifecycle: unsaved → saving → saved", () => {
    let dirty = 1;
    let inFlight = 0;
    const errors: Record<string, string> = {};

    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: dirty,
        inFlightSaveCount: inFlight,
        failedLineSaveCount: countFailedBudgetLineSaves(errors),
      }),
    ).toBe("unsaved");

    inFlight = 1;
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: dirty,
        inFlightSaveCount: inFlight,
        failedLineSaveCount: countFailedBudgetLineSaves(errors),
      }),
    ).toBe("saving");

    inFlight = 0;
    dirty = 0;
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: dirty,
        inFlightSaveCount: inFlight,
        failedLineSaveCount: countFailedBudgetLineSaves(errors),
      }),
    ).toBe("saved");
  });

  it("simulates persistence failure → ERROR without clearing local dirty state", () => {
    expect(
      deriveBudgetWorkspacePersistencePhase({
        editable: true,
        dirtyAccountCount: 1,
        inFlightSaveCount: 0,
        failedLineSaveCount: 1,
      }),
    ).toBe("error");
  });

  it("keeps stale async responses from matching a newer save generation", () => {
    const latest = new Map<string, number>([["acc-1", 2]]);
    expect(isStaleBudgetSaveResult("acc-1", 1, latest)).toBe(true);
    expect(isStaleBudgetSaveResult("acc-1", 2, latest)).toBe(false);
  });
});
