"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

type Props = {
  canManage: boolean;
};

export default function ZielgruppenListToolbar({ canManage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "active";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Zielgruppen suchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={q}
            placeholder="Name, Beschreibung oder Key…"
            className="fca-input w-full pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ q: (e.target as HTMLInputElement).value });
              }
            }}
            onBlur={(e) => updateParams({ q: e.target.value })}
          />
        </label>
        <select
          className="fca-select sm:w-44"
          value={status}
          aria-label="Statusfilter"
          onChange={(e) => updateParams({ status: e.target.value })}
        >
          <option value="active">Aktiv (ohne Archiv)</option>
          <option value="archived">Archiviert</option>
          <option value="all">Alle</option>
        </select>
      </div>
      {canManage ? (
        <Link
          href="/dashboard/communication/zielgruppen/new"
          className="fca-button-primary inline-flex shrink-0 items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neue Zielgruppe
        </Link>
      ) : null}
    </div>
  );
}
