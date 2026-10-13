"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

type Props = {
  canManage: boolean;
  onValidatorCountChange?: (count: number) => void;
  showAnyOneHint?: boolean;
  showEmptyState?: boolean;
};

export default function ClubEventValidatorPoolSection({
  canManage,
  onValidatorCountChange,
  showAnyOneHint = false,
  showEmptyState = false,
}: Props) {
  const [validatorIds, setValidatorIds] = useState<string[]>([]);
  const [chips, setChips] = useState<SceChipSelection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sce/activity-governance/club-event")
      .then((r) => r.json())
      .then((data) => {
        const typePolicy = data.policy?.activityTypes?.find(
          (row: { activityType: string }) => row.activityType === "CLUB_EVENT",
        );
        const ids: string[] = typePolicy?.validatorPersonIds ?? [];
        setValidatorIds(ids);
        setChips(
          ids.map((id) => ({
            id: sceSelectorPickKey("PERSON", id),
            label: id,
          })),
        );
        onValidatorCountChange?.(ids.length);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [onValidatorCountChange]);

  const committedKeys = useMemo(() => new Set(validatorIds.map((id) => sceSelectorPickKey("PERSON", id))), [
    validatorIds,
  ]);

  async function persist(nextIds: string[]) {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sce/activity-governance/club-event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validatorPersonIds: nextIds }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Speichern fehlgeschlagen.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleIdsChange(keys: string[]) {
    const personIds = keys
      .map((key) => {
        const idx = key.indexOf(":");
        return idx > 0 ? key.slice(idx + 1) : key;
      })
      .filter(Boolean);
    setValidatorIds(personIds);
    onValidatorCountChange?.(personIds.length);
    void persist(personIds);
  }

  function handleSelectionKnown(entries: SceChipSelection[]) {
    setChips((prev) => {
      const merged = [...prev];
      for (const entry of entries) {
        if (!merged.some((c) => c.id === entry.id)) merged.push(entry);
      }
      return merged;
    });
  }

  if (!loaded) return null;

  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--border)] p-3"
      data-testid="club-event-validator-pool"
      id="club-event-validator-pool"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Freigabeberechtigte Personen</h3>
        <p className="text-xs text-[var(--text-2)]">
          Diese Personen können eingereichte Veranstaltungen freigeben, Änderungen anfordern oder
          ablehnen.
          {showAnyOneHint ? (
            <>
              {" "}
              Es genügt die Freigabe durch eine der hinterlegten Personen.
            </>
          ) : null}
        </p>
      </div>
      {showEmptyState && validatorIds.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3 text-xs text-[var(--text-2)]"
          data-testid="club-event-validator-pool-empty"
          role="status"
        >
          Es sind noch keine freigabeberechtigten Personen hinterlegt. Füge mindestens eine Person
          hinzu, bevor Ersteller auf «Freigabe erforderlich» gestellt werden können.
        </p>
      ) : null}
      <SceChipMultiSelectorField
        label="Personen"
        selected={chips}
        selectedIds={validatorIds.map((id) => sceSelectorPickKey("PERSON", id))}
        onSelectedIdsChange={handleIdsChange}
        onSelectionKnown={handleSelectionKnown}
        authContext="CLUB_REFERENCE"
        sourceTypes={["PERSON"]}
        mapPickToId={(pick) => (pick.type === "PERSON" ? sceSelectorPickKey("PERSON", pick.id) : null)}
        mapPickToChip={(pick) => ({
          id: sceSelectorPickKey("PERSON", pick.id),
          label: pick.label,
          description: pick.description,
        })}
        disabled={!canManage || saving}
        addButtonLabel="Person hinzufügen"
        dialogTitle="Freigabeberechtigte Personen"
        dialogDescription="Personen mit Berechtigung zur Veranstaltungsfreigabe."
        testIdPrefix="club-event-validator-pool-selector"
        committedPickKeys={committedKeys}
        searchPlaceholder="Name oder E-Mail suchen …"
      />
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
