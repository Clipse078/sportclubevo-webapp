"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Alle Status" },
  { value: "DRAFT", label: "Entwürfe" },
  { value: "PUBLISHED", label: "Gesendet" },
  { value: "ARCHIVED", label: "Archiviert" },
] as const;

type Props = {
  canSend: boolean;
};

export function MitteilungenListToolbar({ canSend }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Mitteilungen suchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={q}
            placeholder="Titel oder Inhalt…"
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
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {canSend ? (
        <Link
          href="/dashboard/communication/mitteilungen/new"
          className="fca-button-primary inline-flex shrink-0 items-center justify-center"
        >
          Neue Mitteilung
        </Link>
      ) : null}
    </div>
  );
}
