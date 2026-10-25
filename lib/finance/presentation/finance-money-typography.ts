/**
 * FIN-05G — canonical Finance amount typography (presentation only).
 * Tabular numerals + restrained hierarchy for scanning dense statements.
 */

/** Primary decision amounts (expected result, management result). */
export const FINANCE_MONEY_PRIMARY_AMOUNT_CLASS =
  "text-lg font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-xl";

/** Comparative summary hero — expected outcome. */
export const FINANCE_MONEY_COMPARATIVE_HERO_CLASS =
  "text-xl font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-2xl";

/** Statement / table body amounts. */
export const FINANCE_MONEY_STATEMENT_AMOUNT_CLASS =
  "text-sm font-medium tabular-nums text-[var(--foreground)]";

/** Secondary contextual evidence (budget plan, actual context). */
export const FINANCE_MONEY_SECONDARY_AMOUNT_CLASS =
  "text-sm font-medium tabular-nums text-[var(--foreground)]";

/** Variance deltas with optional emphasis. */
export const FINANCE_MONEY_VARIANCE_AMOUNT_CLASS =
  "text-sm font-semibold tabular-nums";

/** Compact muted percentages and supporting numerics. */
export const FINANCE_MONEY_SUPPORTING_NUMERIC_CLASS =
  "text-xs font-normal tabular-nums text-[var(--muted)]";
