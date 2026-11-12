"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { type ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import { buildContextualTaskCreateHref } from "@/lib/tasks/task-create-navigation";

export type ContextualTaskCreateTriggerVariant = "button" | "menuItem" | "icon" | "toolbar";

type Props = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> & {
  variant: ContextualTaskCreateTriggerVariant;
  className?: string;
  label?: string;
  createHrefExtras?: Record<string, string | undefined>;
};

export default function ContextualTaskCreateTrigger({
  variant,
  className,
  label = "Aufgabe erstellen",
  contextType,
  contextId,
  createHrefExtras,
}: Props) {
  const createHref = buildContextualTaskCreateHref(contextType, contextId, createHrefExtras);
  const sharedTestId = "contextual-task-create-trigger";

  let trigger = null as ReactNode;

  const linkClass =
    variant === "button"
      ? cn("fca-button-primary inline-flex items-center gap-1.5 text-sm", className)
      : variant === "toolbar"
        ? cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)]/80 px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]/70",
            className,
          )
        : variant === "icon"
          ? cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)]/80 text-[var(--text-2)] hover:bg-[var(--surface-2)]/70",
              className,
            )
          : cn(
              "flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]/90",
              className,
            );

  trigger = (
    <Link
      href={createHref}
      className={linkClass}
      data-testid={sharedTestId}
      role={variant === "menuItem" ? "menuitem" : undefined}
      aria-label={variant === "icon" ? label : undefined}
    >
      {variant === "icon" ? (
        <ProductDomainSceIcon name="tasks" size={16} className="h-4 w-4" />
      ) : (
        <>
          <Plus className={cn("h-4 w-4", variant === "toolbar" ? "text-emerald-400" : "")} aria-hidden />
          {label}
        </>
      )}
    </Link>
  );

  return trigger;
}
