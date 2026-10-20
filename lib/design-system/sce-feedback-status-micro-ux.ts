/**
 * DS-07 micro-UX tokens — restrained semantic surfaces (Communication-aligned).
 */
import { cn } from "@/lib/cn";
import type { SceSemanticFeedbackTone } from "@/lib/design-system/sce-feedback-status-foundation";

export const SCE_FEEDBACK_MICRO_UX_DOC_MARKERS = [
  "SCE_SEMANTIC_FEEDBACK_CONTRACT",
  "SceSemanticFeedback",
  "SceReadinessStatusPanel",
  "SceEmptyState",
  "SceActionableError",
  "SceSkeleton",
  "LOADING_SYSTEM_CANONICAL",
  "EMPTY_STATE_SYSTEM_CANONICAL",
] as const;

export const SCE_FEEDBACK_MICRO_UX_GOVERNANCE = {
  WORLD_CLASS_MICRO_UX_REQUIRED: "YES",
  MICRO_STATE_COVERAGE_REQUIRED: "YES",
  MICRO_ALIGNMENT_CONSISTENCY_REQUIRED: "YES",
  MICRO_RESPONSIVE_QUALITY_REQUIRED: "YES",
  MICRO_ACCESSIBILITY_REQUIRED: "YES",
  LOCAL_MICRO_PATTERN_DRIFT_ALLOWED: "NO",
  REDUCED_MOTION_RESPECTED: "YES",
} as const;

export const SCE_SKELETON_BONE_CLASS =
  "rounded-md bg-[var(--surface-2)] motion-safe:animate-pulse motion-reduce:animate-none";

export function sceSemanticSurfaceClass(tone: SceSemanticFeedbackTone): string {
  switch (tone) {
    case "SUCCESS":
      return "border-[var(--sce-success)]/25 bg-[var(--sce-success)]/5";
    case "WARNING":
      return "border-[var(--sce-warning)]/30 bg-[var(--sce-warning)]/5";
    case "ERROR":
      return "border-[var(--sce-danger)]/30 bg-[var(--sce-danger)]/5";
    case "INFO":
      return "border-[var(--border)] bg-[var(--surface-2)]";
    default:
      return "border-[var(--border)] bg-[var(--surface-1)]";
  }
}

export function sceSemanticIconClass(tone: SceSemanticFeedbackTone): string {
  switch (tone) {
    case "SUCCESS":
      return "text-[var(--sce-success)]";
    case "WARNING":
      return "text-[var(--sce-warning)]";
    case "ERROR":
      return "text-[var(--sce-danger)]";
    case "INFO":
      return "text-[var(--sce-primary)]";
    default:
      return "text-[var(--muted)]";
  }
}

export function sceFeedbackPanelClass(
  tone: SceSemanticFeedbackTone,
  extra?: string,
): string {
  return cn(
    "rounded-xl border p-4 md:p-5",
    sceSemanticSurfaceClass(tone),
    extra,
  );
}
