"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import SceOrgUnitPersonRow from "@/components/sce/org/SceOrgUnitPersonRow";
import type { OrgUnitPersonIdentity } from "@/lib/org/org-unit-people";

type Props = {
  orgUnitName: string;
  people: OrgUnitPersonIdentity[];
  onBack: () => void;
};

export default function OrgUnitInspectorPeoplePanel({ orgUnitName, people, onBack }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      const hay = [
        p.displayName,
        p.functionTitle ?? "",
        p.teamLabels.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [people, query]);

  const showSearch = people.length > 6;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="org-inspector-people-view">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
          aria-label="Zurück zur Einheit"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-[var(--text-1)]">Mitarbeitende</h2>
          <p className="truncate text-xs text-[var(--muted)]">{orgUnitName}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {showSearch ? (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="fca-input w-full pl-9 text-sm"
              aria-label="Mitarbeitende suchen"
              data-testid="org-inspector-people-search"
            />
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {people.length === 0 ? "Noch keine Mitarbeitenden zugeordnet." : "Keine Treffer."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((p) => (
              <li key={p.identityKey}>
                <SceOrgUnitPersonRow
                  personId={p.personId}
                  displayName={p.displayName}
                  functionTitle={p.functionTitle}
                  metaLine={
                    p.teamLabels.length > 0 ? p.teamLabels.join(" · ") : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
