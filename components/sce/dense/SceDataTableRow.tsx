"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_DENSE_DATA_TABLE_ROW_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceDataTableRowProps = {
  children: ReactNode;
  className?: string;
  /** Row-level activation — only when the table row itself is the primary navigation target. */
  onClick?: () => void;
};

/**
 * Client row primitive — optional row activation handlers must not be defined in Server Components.
 */
export function SceDataTableRow({ children, className, onClick }: SceDataTableRowProps) {
  const interactive = Boolean(onClick);

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
      event.preventDefault();
      onClick?.();
    }
  }

  return (
    <tr
      data-sce-data-table-row="true"
      className={cn(SCE_DENSE_DATA_TABLE_ROW_CLASS, interactive && "cursor-pointer", className)}
      onClick={
        interactive
          ? (event) => {
              if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
              onClick?.();
            }
          : undefined
      }
      onKeyDown={interactive ? onKeyDown : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </tr>
  );
}
