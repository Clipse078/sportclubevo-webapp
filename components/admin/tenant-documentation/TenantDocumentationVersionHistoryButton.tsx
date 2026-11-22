"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { useId, useRef, useState } from "react";

import { PopoverContent } from "@/components/ui/Popover";
import { tenantDocumentationVersionPath } from "@/lib/tenant-documentation/sce-tenant-documentation-handoff";

type VersionItem = {
  id: string;
  versionNumber: number;
  publishedAt: string;
  publishedByLabel: string | null;
  isCurrent: boolean;
};

type Props = {
  pageId: string;
};

export function TenantDocumentationVersionHistoryButton({ pageId }: Props) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadVersions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant-documentation/pages/${pageId}/versions`);
      const payload = (await res.json()) as { versions?: VersionItem[]; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Versionsverlauf konnte nicht geladen werden.");
        setVersions([]);
        return;
      }
      setVersions(payload.versions ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && versions === null) {
      await loadVersions();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
        onClick={() => void handleOpen()}
      >
        <Clock className="h-4 w-4" aria-hidden /> Versionsverlauf
      </button>
      <PopoverContent
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value && versions === null) void loadVersions();
        }}
        anchorRef={triggerRef}
        role="dialog"
        surfaceVariant="sce-light"
        matchAnchorWidth={false}
        className="w-80 rounded-md border border-[var(--border)] bg-white p-0 shadow-lg"
      >
        <div id={menuId} className="p-3">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Veröffentlichte Versionen</p>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Wird geladen…</p>
          ) : error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : versions && versions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Noch keine veröffentlichten Versionen.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
              {(versions ?? []).map((version) => {
                const date = new Date(version.publishedAt);
                const dateLabel =
                  isValid(date) && format(date, "d. MMM yyyy, HH:mm", { locale: de });
                return (
                  <li key={version.id} className="py-2 first:pt-0">
                    <Link
                      href={tenantDocumentationVersionPath(pageId, version.id)}
                      className="block rounded px-1 py-0.5 hover:bg-[var(--surface-2)]"
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Version {version.versionNumber}
                        {version.isCurrent ? (
                          <span className="ml-1 text-xs font-normal text-emerald-700">(aktuell)</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">{dateLabel}</span>
                      {version.publishedByLabel ? (
                        <span className="block text-xs text-[var(--muted)]">{version.publishedByLabel}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </>
  );
}