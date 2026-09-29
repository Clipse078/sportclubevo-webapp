"use client";

import { useMemo, useState } from "react";
import { SceListSelectorPanel } from "@/components/sce/list-selector/SceListSelectorPanel";
import { sceGenericDiscoverFetch } from "@/lib/sce/list-selector/sce-generic-discover-client";
import type { SceSelectorPick, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import type { WorkspaceAudienceSearchResult } from "@/lib/workspace/access/access-grant-editor-utils";

type AudienceKind = "PERSON" | "TEAM" | "ORG_UNIT";

const KIND_TO_SOURCE: Record<AudienceKind, SceSelectorSourceType> = {
  PERSON: "PERSON",
  TEAM: "TEAM",
  ORG_UNIT: "ORG_UNIT",
};

type Props = {
  audienceKind: AudienceKind;
  selected: WorkspaceAudienceSearchResult | null;
  onSelected: (value: WorkspaceAudienceSearchResult | null) => void;
  disabled?: boolean;
};

export function WorkspaceAccessAudienceScePicker({
  audienceKind,
  selected,
  onSelected,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const sourceType = KIND_TO_SOURCE[audienceKind];

  const fetchResults = useMemo(
    () =>
      sceGenericDiscoverFetch({
        authContext: "WORKSPACE_ACCESS",
        sourceTypes: [sourceType],
      }),
    [sourceType],
  );

  function handlePick(pick: SceSelectorPick) {
    if (pick.type !== sourceType) return;
    onSelected({
      type: audienceKind,
      id: pick.id,
      label: pick.label,
    });
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="fca-button-secondary text-sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid={`workspace-access-sce-picker-${audienceKind.toLowerCase()}`}
      >
        {selected ? selected.label : "Aus Liste wählen …"}
      </button>
      {selected ? (
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => onSelected(null)}
        >
          Auswahl zurücksetzen
        </button>
      ) : null}

      <SceListSelectorPanel
        open={open}
        onOpenChange={setOpen}
        title={
          audienceKind === "PERSON"
            ? "Person für Zugriff wählen"
            : audienceKind === "TEAM"
              ? "Team für Zugriff wählen"
              : "Organisationseinheit wählen"
        }
        enabledTypes={[sourceType]}
        mode="single"
        fetchResults={fetchResults}
        onPick={handlePick}
        disabled={disabled}
        testIdPrefix="workspace-access-sce"
      />
    </div>
  );
}
