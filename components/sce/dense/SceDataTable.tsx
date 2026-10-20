import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_DENSE_DATA_TABLE_CELL_CLASS,
  SCE_DENSE_DATA_TABLE_CLASS,
  SCE_DENSE_DATA_TABLE_HEAD_CLASS,
  SCE_DENSE_DATA_TABLE_ROW_CLASS,
  SCE_DENSE_DATA_TABLE_SHELL_CLASS,
} from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceDataTableProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

export function SceDataTable({
  children,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId = "sce-data-table",
}: SceDataTableProps) {
  return (
    <div
      data-sce-data-table-shell="true"
      data-testid={`${testId}-shell`}
      className={cn(SCE_DENSE_DATA_TABLE_SHELL_CLASS, className)}
    >
      <table
        data-sce-data-table="true"
        data-testid={testId}
        aria-label={ariaLabel}
        className={SCE_DENSE_DATA_TABLE_CLASS}
      >
        {children}
      </table>
    </div>
  );
}

export function SceDataTableHead({ children }: { children: ReactNode }) {
  return <thead className={SCE_DENSE_DATA_TABLE_HEAD_CLASS}>{children}</thead>;
}

export function SceDataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[color-mix(in_srgb,var(--border)_45%,transparent)]">{children}</tbody>;
}

export function SceDataTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
      event.preventDefault();
      onClick();
    }
  }

  return (
    <tr
      data-sce-data-table-row="true"
      className={cn(SCE_DENSE_DATA_TABLE_ROW_CLASS, onClick && "cursor-pointer", className)}
      onClick={
        onClick
          ? (event) => {
              if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
              onClick();
            }
          : undefined
      }
      onKeyDown={onKeyDown}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </tr>
  );
}

export function SceDataTableCell({
  children,
  className,
  align,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td
      className={cn(
        SCE_DENSE_DATA_TABLE_CELL_CLASS,
        align === "right" && "text-right tabular-nums",
        className,
      )}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export function SceDataTableHeaderCell({
  children,
  className,
  align,
  scope = "col",
  sort,
  "aria-sort": ariaSort,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  scope?: "col" | "row";
  sort?: boolean;
  "aria-sort"?: "none" | "ascending" | "descending" | "other";
}) {
  return (
    <th
      scope={scope}
      aria-sort={sort ? ariaSort : undefined}
      className={cn(
        "px-3 py-2.5 font-medium sm:px-4 sm:py-3",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}
