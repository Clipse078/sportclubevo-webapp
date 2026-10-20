"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_DENSE_SORT_BUTTON_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceSortDirection = "asc" | "desc" | false;

export type SceSortableColumnHeaderProps = {
  label: string;
  sortDirection: SceSortDirection;
  onSort: () => void;
  className?: string;
  align?: "left" | "right";
};

export function SceSortableColumnHeader({
  label,
  sortDirection,
  onSort,
  className,
  align = "left",
}: SceSortableColumnHeaderProps) {
  const ariaSort =
    sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none";

  const Icon =
    sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onSort}
      aria-label={`Sortieren nach ${label}`}
      aria-sort={ariaSort}
      data-sce-dense-sort="true"
      className={cn(
        SCE_DENSE_SORT_BUTTON_CLASS,
        align === "right" && "ml-auto",
        sortDirection && "text-[var(--foreground)]",
        className,
      )}
    >
      <span>{label}</span>
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          !sortDirection && "opacity-40 group-hover:opacity-70",
        )}
        aria-hidden
      />
    </button>
  );
}
