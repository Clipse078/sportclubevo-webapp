"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_DENSE_CELL_X_CLASS,
  SCE_DENSE_MOBILE_META_GRID_CLASS,
  SCE_DENSE_ROW_ATTENTION_CLASS,
  SCE_DENSE_ROW_BASE_CLASS,
  SCE_DENSE_ROW_DISABLED_CLASS,
  SCE_DENSE_ROW_INTERACTIVE_CLASS,
  SCE_DENSE_ROW_SELECTED_CLASS,
  SCE_DENSE_ROW_Y_CLASS,
} from "@/lib/design-system/sce-dense-ui-micro-ux";

export type SceDenseGridRowProps = {
  children: ReactNode;
  gridClassName: string;
  /** Shown below primary column on mobile (structured metadata). */
  mobileMeta?: ReactNode;
  onActivate?: () => void;
  activateLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  attention?: boolean;
  className?: string;
  "data-testid"?: string;
};

export function SceDenseGridRow({
  children,
  gridClassName,
  mobileMeta,
  onActivate,
  activateLabel,
  selected = false,
  disabled = false,
  attention = false,
  className,
  "data-testid": testId,
}: SceDenseGridRowProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onActivate || disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <div
      role="row"
      data-sce-dense-grid-row="true"
      data-testid={testId}
      tabIndex={onActivate && !disabled ? 0 : undefined}
      aria-label={onActivate ? activateLabel : undefined}
      onKeyDown={onKeyDown}
      onClick={
        onActivate && !disabled
          ? (event) => {
              if ((event.target as HTMLElement).closest("[data-sce-row-action]")) return;
              onActivate();
            }
          : undefined
      }
      className={cn(
        SCE_DENSE_ROW_BASE_CLASS,
        SCE_DENSE_CELL_X_CLASS,
        SCE_DENSE_ROW_Y_CLASS,
        "flex flex-col gap-2 md:grid md:items-center md:gap-3",
        gridClassName,
        onActivate && !disabled && SCE_DENSE_ROW_INTERACTIVE_CLASS,
        onActivate && !disabled && "cursor-pointer",
        selected && SCE_DENSE_ROW_SELECTED_CLASS,
        disabled && SCE_DENSE_ROW_DISABLED_CLASS,
        attention && SCE_DENSE_ROW_ATTENTION_CLASS,
        className,
      )}
    >
      {children}
      {mobileMeta ? <div className={SCE_DENSE_MOBILE_META_GRID_CLASS}>{mobileMeta}</div> : null}
    </div>
  );
}

export function SceDenseGridCell({
  children,
  className,
  /** Hide on mobile when stacked metadata covers this field. */
  hideOnMobile,
  align,
}: {
  children: ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  align?: "start" | "end";
}) {
  return (
    <div
      role="cell"
      className={cn(
        "relative z-[1] min-w-0",
        hideOnMobile && "hidden md:block",
        align === "end" && "md:text-right",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SceDenseRowActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-sce-row-action="true"
      className={cn("relative z-[2] flex justify-end md:justify-end", className)}
    >
      {children}
    </div>
  );
}
