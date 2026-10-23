/**
 * FIN-03A-R4 — shared column geometry for Ist-Buchungen booking list.
 * Header and body share one table-fixed colgroup contract.
 */

export const FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS =
  "w-full min-w-0 table-fixed text-sm";

export type FinanceActualsBookingsColumnMode = "WITH_ACTIONS" | "VIEW_ONLY";

const COLUMN_WIDTHS: Record<FinanceActualsBookingsColumnMode, readonly string[]> = {
  WITH_ACTIONS: ["11%", "20%", "11%", "14%", "28%", "16%"],
  VIEW_ONLY: ["12%", "24%", "14%", "16%", "34%"],
};

export function FinanceActualsBookingsColGroup(props: {
  mode: FinanceActualsBookingsColumnMode;
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

export const FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS =
  "px-4 py-2 text-left text-xs font-medium uppercase tracking-wide";

export const FINANCE_ACTUALS_BOOKINGS_HEAD_NUMERIC_CLASS =
  "px-4 py-2 text-right text-xs font-medium uppercase tracking-wide tabular-nums";

export const FINANCE_ACTUALS_BOOKINGS_HEAD_ACTIONS_CLASS =
  "px-4 py-2 text-right text-xs font-medium uppercase tracking-wide";

export const FINANCE_ACTUALS_BOOKINGS_CELL_TEXT_CLASS =
  "px-4 py-2 text-left align-top break-words";

export const FINANCE_ACTUALS_BOOKINGS_CELL_NUMERIC_CLASS =
  "px-4 py-2 text-right align-top tabular-nums whitespace-nowrap";

export const FINANCE_ACTUALS_BOOKINGS_CELL_DESCRIPTION_CLASS =
  "px-4 py-2 text-left align-top break-words min-w-0";

export const FINANCE_ACTUALS_BOOKINGS_CELL_ACTIONS_CLASS =
  "px-4 py-2 text-right align-top whitespace-nowrap";

export const FINANCE_ACTUALS_BOOKINGS_TABLE_SCROLL_CLASS = "min-w-0 overflow-x-auto";
