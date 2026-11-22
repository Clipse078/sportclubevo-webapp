"use client";

import { Archive, MoreHorizontal, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import { PopoverContent } from "@/components/ui/Popover";

type Props = {
  pageId: string;
  pageTitle: string;
  canManage: boolean;
  onLifecycleAction: (redirectHref: string) => void;
};

export function TenantDocumentationPageActionsMenu({
  pageId,
  pageTitle,
  canManage,
  onLifecycleAction,
}: Props) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function runArchive() {
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant-documentation/pages/${pageId}/archive`, {
        method: "POST",
      });
      const payload = (await res.json()) as { redirectHref?: string; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Archivieren fehlgeschlagen.");
        return;
      }
      if (payload.redirectHref) {
        onLifecycleAction(payload.redirectHref);
      }
    } finally {
      setBusy(false);
    }
  }

  async function runTrash() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant-documentation/pages/${pageId}/trash`, {
        method: "POST",
      });
      const payload = (await res.json()) as { redirectHref?: string; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setConfirmDeleteOpen(false);
      if (payload.redirectHref) {
        onLifecycleAction(payload.redirectHref);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={busy}
        title="Seitenmenü"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      <PopoverContent
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchorRef={triggerRef}
        role="listbox"
        surfaceVariant="sce-light"
        matchAnchorWidth={false}
        className="w-52 rounded-md border border-[var(--border)] bg-white p-1 shadow-lg"
      >
          <div id={menuId} role="menu" className="flex flex-col">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
              onClick={() => void runArchive()}
              disabled={busy}
            >
              <Archive className="h-4 w-4" /> Archivieren
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={() => {
                setMenuOpen(false);
                setConfirmDeleteOpen(true);
              }}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" /> Seite löschen
            </button>
          </div>
      </PopoverContent>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {confirmDeleteOpen ? (
        <div className="mt-3 max-w-lg">
          <SceInlineDestructiveConfirm
            title="Seite löschen?"
            description={`„${pageTitle}" wird in den Papierkorb verschoben und kann wiederhergestellt werden.`}
            confirmLabel="In Papierkorb verschieben"
            cancelLabel="Abbrechen"
            pending={busy}
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={() => void runTrash()}
          />
        </div>
      ) : null}
    </>
  );
}