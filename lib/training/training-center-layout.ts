import { cn } from "@/lib/cn";

/** Standard TrainingCenter workspace width (calendar, serien, forms). */
export const TRAINING_CENTER_WORKSPACE_STANDARD_CLASS = "mx-auto w-full max-w-6xl";

/** Planning grid only — wider timeline workspace; header still aligns via shell. */
export const TRAINING_CENTER_WORKSPACE_PLANNING_CLASS = "mx-auto w-full max-w-[1600px]";

/** Constrained editor column inside the standard workspace. */
export const TRAINING_CENTER_EDITOR_MAX_CLASS = "max-w-3xl";

export type TrainingCenterWorkspaceWidth = "standard" | "planning";

export function trainingCenterWorkspaceClass(width: TrainingCenterWorkspaceWidth): string {
  return width === "planning" ? TRAINING_CENTER_WORKSPACE_PLANNING_CLASS : TRAINING_CENTER_WORKSPACE_STANDARD_CLASS;
}

export function trainingCenterWorkspaceCn(
  width: TrainingCenterWorkspaceWidth,
  className?: string,
): string {
  return cn(trainingCenterWorkspaceClass(width), className);
}
