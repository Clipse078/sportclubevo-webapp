"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

/** Secondary action for adding a resource within a facility card (SCE dark surfaces). */
export function AddFacilityResourceButton({ onClick, className, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid="add-facility-resource-button"
      className={cn(
        "mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--muted)] transition",
        "hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-focus-ring,var(--sce-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Ressource hinzufügen
    </button>
  );
}
