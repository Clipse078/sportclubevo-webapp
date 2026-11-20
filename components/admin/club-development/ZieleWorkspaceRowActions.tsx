"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { buildVereinsentwicklungTargetTaskCreateHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

type Props = {
  targetId: string;
  canCreateTask: boolean;
  returnTo: string;
  orgUnitId?: string | null;
};

export default function ZieleWorkspaceRowActions({
  targetId,
  canCreateTask,
  returnTo,
  orgUnitId = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!canCreateTask) return null;

  const createHref = buildVereinsentwicklungTargetTaskCreateHref({
    targetId,
    returnTo,
    orgUnitId,
  });

  return (
    <div ref={rootRef} className="relative" data-testid={`ziele-row-actions-${targetId}`}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)]",
          "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Aktionen"
        data-testid={`ziele-row-menu-toggle-${targetId}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-md"
          data-testid={`ziele-row-menu-${targetId}`}
        >
          <Link
            href={createHref}
            role="menuitem"
            className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            data-testid={`ziele-row-aufgabe-erstellen-${targetId}`}
            data-sce-contextual-create-flow="full-page"
            onClick={() => setOpen(false)}
          >
            Aufgabe erstellen
          </Link>
        </div>
      ) : null}
      <span className="sr-only">{CD_VORHABEN_WORKSPACE_COPY.createTaskAction}</span>
    </div>
  );
}