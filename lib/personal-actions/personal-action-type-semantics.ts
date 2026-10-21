/**
 * Canonical semantic treatment for Meine Aufgaben inbox type pills (DS-10 R4.1).
 */
import { cn } from "@/lib/cn";
import type { PersonalActionSourceType } from "./types";

export const PERSONAL_ACTION_INBOX_TYPE_SEMANTICS = {
  TASK_TYPE_TEXT_REQUIRED: "YES",
  TASK_TYPE_SEMANTIC_COLOUR_REQUIRED: "YES",
  COLOUR_ONLY_TASK_TYPE_SEMANTICS: "NO",
  LOCAL_RANDOM_BADGE_COLOURS: "NO",
  TASK_TYPE_VISUAL_SYSTEM_SHARED: "YES",
} as const;

export type PersonalActionInboxTypeKey = Extract<
  PersonalActionSourceType,
  "TASK" | "ATTENDANCE_RESPONSE" | "REQUIREMENT"
>;

export type PersonalActionTypeSemantic = {
  /** Uppercase textual pill label (required semantic signal alongside colour). */
  pillText: string;
  surfaceClass: string;
  textClass: string;
  borderClass: string;
};

const PERSONAL_ACTION_TYPE_SEMANTIC_MAP: Record<
  PersonalActionInboxTypeKey,
  PersonalActionTypeSemantic
> = {
  TASK: {
    pillText: "AUFGABE",
    surfaceClass: "bg-[var(--sce-warning)]/10",
    textClass: "text-[var(--sce-warning)]",
    borderClass: "border-[var(--sce-warning)]/35",
  },
  ATTENDANCE_RESPONSE: {
    pillText: "TEILNAHME",
    surfaceClass: "bg-[var(--sce-primary)]/10",
    textClass: "text-[var(--sce-primary)]",
    borderClass: "border-[var(--sce-primary)]/35",
  },
  REQUIREMENT: {
    pillText: "ANFORDERUNG",
    surfaceClass: "bg-[var(--sce-success)]/10",
    textClass: "text-[var(--sce-success)]",
    borderClass: "border-[var(--sce-success)]/30",
  },
};

export function resolvePersonalActionInboxTypeKey(
  sourceType: PersonalActionSourceType,
): PersonalActionInboxTypeKey | null {
  if (sourceType === "TASK" || sourceType === "ATTENDANCE_RESPONSE" || sourceType === "REQUIREMENT") {
    return sourceType;
  }
  return null;
}

export function personalActionTypeSemantic(
  sourceType: PersonalActionSourceType,
): PersonalActionTypeSemantic | null {
  const key = resolvePersonalActionInboxTypeKey(sourceType);
  if (!key) return null;
  return PERSONAL_ACTION_TYPE_SEMANTIC_MAP[key];
}

export function personalActionTypeChipClassName(
  sourceType: PersonalActionSourceType,
  extra?: string,
): string | null {
  const semantic = personalActionTypeSemantic(sourceType);
  if (!semantic) return null;
  return cn(
    "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5",
    "text-[0.625rem] font-semibold uppercase tracking-wide leading-none",
    semantic.surfaceClass,
    semantic.textClass,
    semantic.borderClass,
    extra,
  );
}

export function personalActionTypePillText(sourceType: PersonalActionSourceType): string | null {
  return personalActionTypeSemantic(sourceType)?.pillText ?? null;
}
