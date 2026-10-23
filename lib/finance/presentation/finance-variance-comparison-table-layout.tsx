/**
 * FIN-03A — shared column geometry for Einnahmen / Ausgaben variance comparison tables.
 * Both sections must use the same widths so numeric columns align vertically.
 */

export const FINANCE_VARIANCE_COMPARISON_TABLE_CLASS =
  "w-full min-w-0 table-fixed text-sm";

export type FinanceVarianceComparisonColumnMode = "FULL_YEAR" | "YTD";

const COLUMN_WIDTHS: Record<FinanceVarianceComparisonColumnMode, readonly string[]> = {
  FULL_YEAR: ["34%", "16.5%", "16.5%", "16.5%", "16.5%"],
  YTD: ["50%", "25%", "25%"],
};

export function FinanceVarianceComparisonColGroup(props: {
  mode: FinanceVarianceComparisonColumnMode;
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
