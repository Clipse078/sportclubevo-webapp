"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TenantDocumentationArchivRestoreButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant-documentation/pages/${pageId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "archive" }),
      });
      const payload = (await res.json()) as { href?: string; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Wiederherstellen fehlgeschlagen.");
        return;
      }
      if (payload.href) {
        router.push(payload.href);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void restore()}
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        Wiederherstellen
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}