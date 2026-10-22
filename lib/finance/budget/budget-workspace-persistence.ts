/**
 * FIN-02A R2 — workspace-level persistence feedback derived from local-first line editing.
 * No second save mechanism; phases mirror dirty / in-flight / line-error signals only.
 */

export type BudgetWorkspacePersistencePhase =
  | "hidden"
  | "unsaved"
  | "saving"
  | "saved"
  | "error";

export function deriveBudgetWorkspacePersistencePhase(input: {
  editable: boolean;
  dirtyAccountCount: number;
  inFlightSaveCount: number;
  failedLineSaveCount: number;
}): BudgetWorkspacePersistencePhase {
  if (!input.editable) return "hidden";
  if (input.inFlightSaveCount > 0) return "saving";
  if (input.failedLineSaveCount > 0) return "error";
  if (input.dirtyAccountCount > 0) return "unsaved";
  return "saved";
}

export function countFailedBudgetLineSaves(lineErrors: Readonly<Record<string, string>>): number {
  return Object.keys(lineErrors).length;
}
