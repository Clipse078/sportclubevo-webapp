/**
 * FIN-03A — shared column geometry for Einnahmen / Ausgaben variance comparison tables.
 * Both sections must use the same widths so numeric columns align vertically.
 */

export const FINANCE_VARIANCE_COMPARISON_TABLE_CLASS =
  "w-full min-w-0 table-fixed text-sm";

export type FinanceVarianceComparisonColumnMode = "FULL_YEAR" | "YTD" | "PERIOD";

export type FinanceVarianceComparisonExtendedColumnMode =
  FinanceVarianceComparisonColumnMode | "MANAGEMENT_PNL";

const COLUMN_WIDTHS: Record<FinanceVarianceComparisonExtendedColumnMode, readonly string[]> = {
  FULL_YEAR: ["34%", "16.5%", "16.5%", "16.5%", "16.5%"],
  YTD: ["50%", "25%", "25%"],
  PERIOD: ["34%", "22%", "22%", "22%"],
  MANAGEMENT_PNL: ["38%", "15.5%", "15.5%", "15.5%", "15.5%"],
};

export function FinanceVarianceComparisonColGroup(props: {
  mode: FinanceVarianceComparisonExtendedColumnMode;
}) {
  const widths = COLUMN_WIDTHS[props.mode];
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );
}

export const FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS =
  "px-4 py-2 text-left align-top break-words";

export const FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS =
  "px-4 py-2 text-right tabular-nums";

export const FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS =
  "px-4 py-2 text-left text-xs font-medium uppercase tracking-wide";

export const FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS =
  "px-4 py-2 text-right text-xs font-medium uppercase tracking-wide tabular-nums";

export const FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS =
  "px-3 py-1.5 text-left align-top break-words";

export const FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS =
  "px-3 py-1.5 text-right tabular-nums";

export const FINANCE_MANAGEMENT_PNL_HEAD_ACCOUNT_CLASS =
  "px-3 py-1.5 text-left text-xs font-medium text-[var(--muted)]";

export const FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS =
  "px-3 py-1.5 text-right text-xs font-medium text-[var(--muted)] tabular-nums";

/** FIN-05C R1 — opaque-enough reading surface for dense management statements. */
export const FINANCE_MANAGEMENT_PNL_TABLE_SURFACE_CLASS =
  "overflow-x-auto rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] shadow-[var(--sce-surface-shadow)]";

export const FINANCE_MANAGEMENT_PNL_TABLE_HEAD_ROW_CLASS =
  "border-b border-[var(--sce-surface-border-subtle)] bg-[var(--sce-surface-dense)]";
