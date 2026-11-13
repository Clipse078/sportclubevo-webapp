"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_SURFACE_DENSE_PANEL } from "@/lib/shell/sce-surface-system";

export type OperationalDensePanelShellProps = {
  children: ReactNode;
  /** Compact readiness / open-points label above the section title (Matchcenter parity). */
  openPointsLabel?: string | null;
  sectionTitle?: string;
  isSaving?: boolean;
  testId?: string;
  className?: string;
  onPointerDown?: (event: { stopPropagation: () => void }) => void;
  onClick?: (event: { stopPropagation: () => void }) => void;
};

/**
 * Shared dense operational panel frame — Matchcenter Spielvorbereitung and Wochenplaner Liste.
 */
export function OperationalDensePanelShell({
  children,
  openPointsLabel = null,
  sectionTitle = "Spielvorbereitung",
  isSaving = false,
  testId = "operational-dense-panel",
  className,
  onPointerDown,
  onClick,
}: OperationalDensePanelShellProps) {
  return (
    <div
      className={cn("min-w-0 overflow-hidden", SCE_SURFACE_DENSE_PANEL, "px-3 py-2.5", className)}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {openPointsLabel ? (
        <p className="text-xs font-semibold text-[var(--foreground)]" data-testid={`${testId}-open-points`}>
          {openPointsLabel}
        </p>
      ) : null}
      <div className="mt-1 flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[0.625rem] font-bold uppercase tracking-wide text-[var(--muted)]",
            openPointsLabel ? undefined : "mt-0",
          )}
        >
          {sectionTitle}
        </p>
        {isSaving ? (
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--muted)]" aria-live="polite">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Speichern…
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
