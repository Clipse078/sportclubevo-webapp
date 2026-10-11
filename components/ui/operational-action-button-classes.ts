import { cn } from "@/lib/cn";

/**
 * Compact row actions for reversible sports operations (Aufbieten, Entfernen, Freigeben).
 *
 * STATUS colors (badges, availability) communicate state.
 * These ACTION colors communicate interaction only — not success/danger semantics.
 */

export const OPERATIONAL_ACTION_BUTTON_BASE =
  "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md py-1.5 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-50";

/** SCE accent (orange/gold) — add-to-selection actions such as Aufbieten. */
export const OPERATIONAL_ACTION_ACCENT_CLASS = cn(
  OPERATIONAL_ACTION_BUTTON_BASE,
  "border border-[color-mix(in_srgb,var(--sce-primary)_32%,var(--border))] bg-[var(--sce-primary-light)] px-3 text-[var(--sce-primary)] hover:bg-[color-mix(in_srgb,var(--sce-primary-light)_75%,var(--surface-2))]",
);

/** Neutral slate — remove-from-selection and secondary ops (Entfernen, Freigeben). */
export const OPERATIONAL_ACTION_NEUTRAL_CLASS = cn(
  OPERATIONAL_ACTION_BUTTON_BASE,
  "border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
);

/** Same as neutral, slightly tighter horizontal padding for paired row actions. */
export const OPERATIONAL_ACTION_NEUTRAL_COMPACT_CLASS = cn(
  OPERATIONAL_ACTION_NEUTRAL_CLASS,
  "px-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)]",
);
