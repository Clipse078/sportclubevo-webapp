"use client";

import { LayoutTemplate } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  INBOX_WORKSPACE_DENSITIES,
  INBOX_WORKSPACE_DENSITY_LABELS,
  INBOX_WORKSPACE_LAYOUT_LABELS,
  INBOX_WORKSPACE_LAYOUTS,
  type InboxWorkspaceDensity,
  type InboxWorkspaceLayout,
} from "@/lib/communication/inbox/inbox-workspace-preferences";

type CommunicationInboxViewControlProps = {
  layout: InboxWorkspaceLayout;
  density: InboxWorkspaceDensity;
  onLayoutChange: (layout: InboxWorkspaceLayout, options?: { resetSplit?: boolean }) => void;
  onDensityChange: (density: InboxWorkspaceDensity) => void;
  onResetDefaults: () => void;
  persistError?: string | null;
};

export function CommunicationInboxViewControl({
  layout,
  density,
  onLayoutChange,
  onDensityChange,
  onResetDefaults,
  persistError,
}: CommunicationInboxViewControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ansicht und Dichte"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        data-testid="communication-inbox-view-control"
      >
        <LayoutTemplate className="h-3.5 w-3.5" aria-hidden />
        Ansicht
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Ansicht"
          className="absolute right-0 z-20 mt-1 min-w-[14rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 shadow-lg"
        >
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Ansicht
          </p>
          <ul className="px-1">
            {INBOX_WORKSPACE_LAYOUTS.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={layout === item}
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                    layout === item
                      ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)]/70",
                  )}
                  onClick={() => {
                    onLayoutChange(item, { resetSplit: item === layout });
                    setOpen(false);
                  }}
                >
                  {INBOX_WORKSPACE_LAYOUT_LABELS[item]}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Dichte
          </p>
          <ul className="px-1">
            {INBOX_WORKSPACE_DENSITIES.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={density === item}
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                    density === item
                      ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)]/70",
                  )}
                  onClick={() => {
                    onDensityChange(item);
                    setOpen(false);
                  }}
                >
                  {INBOX_WORKSPACE_DENSITY_LABELS[item]}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-[var(--border)] px-1 pt-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
              onClick={() => {
                onResetDefaults();
                setOpen(false);
              }}
            >
              Auf Standard zurücksetzen
            </button>
          </div>
        </div>
      ) : null}

      {persistError ? (
        <p className="sr-only" role="status">
          {persistError}
        </p>
      ) : null}
    </div>
  );
}
