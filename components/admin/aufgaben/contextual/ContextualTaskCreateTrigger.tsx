"use client";

import { useState, type ReactNode } from "react";
import { ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskCreateDialog from "./ContextualTaskCreateDialog";

export type ContextualTaskCreateTriggerVariant = "button" | "menuItem" | "icon" | "toolbar";

type Props = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> & {
  variant: ContextualTaskCreateTriggerVariant;
  className?: string;
  label?: string;
};

export default function ContextualTaskCreateTrigger({
  variant,
  className,
  label = "Aufgabe erstellen",
  ...dialogProps
}: Props) {
  const [open, setOpen] = useState(false);

  function openDialog() {
    setOpen(true);
  }

  const sharedTestId = "contextual-task-create-trigger";

  let trigger = null as ReactNode;

  if (variant === "button") {
    trigger = (
      <button
        type="button"
        className={cn("fca-button-primary inline-flex items-center gap-1.5 text-sm", className)}
        onClick={openDialog}
        data-testid={sharedTestId}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </button>
    );
  } else if (variant === "toolbar") {
    trigger = (
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)]/80 px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]/70",
          className,
        )}
        onClick={openDialog}
        data-testid={sharedTestId}
      >
        <Plus className="h-4 w-4 text-emerald-400" aria-hidden />
        {label}
      </button>
    );
  } else if (variant === "icon") {
    trigger = (
      <button
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)]/80 text-[var(--text-2)] hover:bg-[var(--surface-2)]/70",
          className,
        )}
        onClick={openDialog}
        data-testid={sharedTestId}
      >
        <ListChecks className="h-4 w-4" aria-hidden />
      </button>
    );
  } else {
    trigger = (
      <button
        type="button"
        role="menuitem"
        className={cn(
          "flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90",
          className,
        )}
        onClick={openDialog}
        data-testid={sharedTestId}
      >
        <ListChecks className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <>
      {trigger}
      <ContextualTaskCreateDialog open={open} onOpenChange={setOpen} {...dialogProps} />
    </>
  );
}
