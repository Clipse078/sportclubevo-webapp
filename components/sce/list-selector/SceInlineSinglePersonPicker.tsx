"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SceListSelectorPanel } from "@/components/sce/list-selector/SceListSelectorPanel";
import { sceGenericDiscoverFetch } from "@/lib/sce/list-selector/sce-generic-discover-client";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";

export type SceInlineSinglePersonSelection = {
  id: string;
  label: string;
  description?: string | null;
};

type Props = {
  selected: SceInlineSinglePersonSelection | null;
  onSelect: (person: SceInlineSinglePersonSelection) => void;
  onClearSelected?: () => void;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
  testIdPrefix?: string;
};

function PersonAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--blue)]"
    >
      {initials || "?"}
    </div>
  );
}

export function SceInlineSinglePersonPicker({
  selected,
  onSelect,
  onClearSelected,
  placeholder = "Person suchen …",
  disabled = false,
  excludeIds = [],
  testIdPrefix = "sce-inline-person-picker",
}: Props) {
  const [open, setOpen] = useState(false);

  const fetchResults = useMemo(
    () =>
      sceGenericDiscoverFetch({
        authContext: "CLUB_REFERENCE",
        sourceTypes: ["PERSON"],
      }),
    [],
  );

  const committedKeys = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set([`PERSON:${selected.id}`]);
  }, [selected]);

  function handlePick(pick: SceSelectorPick) {
    if (pick.type !== "PERSON" || excludeIds.includes(pick.id)) return;
    onSelect({
      id: pick.id,
      label: pick.label,
      description: pick.description,
    });
    setOpen(false);
  }

  return (
    <div className="relative w-full" data-testid={testIdPrefix}>
      {selected ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2.5">
          <PersonAvatar name={selected.label} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{selected.label}</p>
            {selected.description ? (
              <p className="truncate text-xs text-[var(--muted)]">{selected.description}</p>
            ) : null}
          </div>
          {onClearSelected ? (
            <button
              type="button"
              onClick={onClearSelected}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-slate-200 hover:text-[var(--foreground)]"
              aria-label="Auswahl aufheben"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`sce-page-search w-full text-left${disabled ? " pointer-events-none opacity-50" : ""}`}
          data-testid={`${testIdPrefix}-open`}
        >
          <Search className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span className="text-sm text-[var(--muted)]">{placeholder}</span>
        </button>
      )}

      <SceListSelectorPanel
        open={open}
        onOpenChange={setOpen}
        title="Person auswählen"
        description="Personen im Verein durchsuchen und auswählen."
        enabledTypes={["PERSON"]}
        mode="single"
        committedKeys={committedKeys}
        fetchResults={fetchResults}
        onPick={handlePick}
        disabled={disabled}
        testIdPrefix={testIdPrefix}
        searchPlaceholder="Name oder E-Mail …"
      />
    </div>
  );
}
