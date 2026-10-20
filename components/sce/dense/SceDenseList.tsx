import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_DENSE_ROW_BASE_CLASS,
  SCE_DENSE_ROW_INTERACTIVE_CLASS,
  SCE_DENSE_CELL_X_CLASS,
  SCE_DENSE_ROW_Y_CLASS,
} from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceDenseListProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

export function SceDenseList({
  children,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId = "sce-dense-list",
}: SceDenseListProps) {
  return (
    <ul
      data-sce-dense-list="true"
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn("m-0 list-none divide-y divide-[var(--border)] p-0", className)}
    >
      {children}
    </ul>
  );
}

export type SceDenseListRowProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "li" | "div";
};

export function SceDenseListRow({
  children,
  className,
  interactive = false,
  as: Tag = "li",
}: SceDenseListRowProps) {
  return (
    <Tag
      data-sce-dense-list-row="true"
      className={cn(
        SCE_DENSE_ROW_BASE_CLASS,
        SCE_DENSE_CELL_X_CLASS,
        SCE_DENSE_ROW_Y_CLASS,
        "border-b-0",
        interactive && SCE_DENSE_ROW_INTERACTIVE_CLASS,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
