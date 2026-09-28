"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

type Props = {
  canManage: boolean;
  showCreateAction?: boolean;
};

export default function VorlagenListToolbar({ canManage, showCreateAction = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const kind = searchParams.get("kind") ?? "all";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Vorlagen suchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={q}
            placeholder="Name oder Inhalt…"
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
          value={kind}
          aria-label="Typfilter"
          onChange={(e) => updateParams({ kind: e.target.value })}
        >
          <option value="all">Alle</option>
          <option value="mitteilungen">Mitteilungen</option>
          <option value="campaign">Kampagnen</option>
        </select>
      </div>
      {canManage && showCreateAction ? (
        <Link
          href="/dashboard/communication/vorlagen/new"
          className="fca-button-primary inline-flex shrink-0 items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neue Vorlage
        </Link>
      ) : null}
    </div>
  );
}
