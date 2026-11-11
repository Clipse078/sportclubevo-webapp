"use client";

import { useMemo } from "react";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

type KnownPerson = {
  personId: string;
  label: string;
  description?: string | null;
};

type Props = {
  label?: string;
  selectedPersonIds: string[];
  onSelectedPersonIdsChange: (ids: string[]) => void;
  initialKnown?: KnownPerson[];
  disabled?: boolean;
};

export default function MeetingParticipantMultiPicker({
  label = "Teilnehmer",
  selectedPersonIds,
  onSelectedPersonIdsChange,
  initialKnown = [],
  disabled = false,
}: Props) {
  const knownById = useMemo(() => {
    const map = new Map<string, KnownPerson>();
    for (const person of initialKnown) {
      map.set(person.personId, person);
    }
    return map;
  }, [initialKnown]);

  const committedPickKeys = useMemo(
    () => new Set(selectedPersonIds.map((id) => sceSelectorPickKey("PERSON", id))),
    [selectedPersonIds],
  );

  const selectedChips: SceChipSelection[] = selectedPersonIds.map((id) => {
    const known = knownById.get(id);
    return { id, label: known?.label ?? id, description: known?.description ?? null };
  });

  return (
    <SceChipMultiSelectorField
      label={label}
      hideLabel={false}
      selected={selectedChips}
      selectedIds={selectedPersonIds}
      onSelectedIdsChange={onSelectedPersonIdsChange}
      authContext="CLUB_REFERENCE"
      sourceTypes={["PERSON"]}
      committedPickKeys={committedPickKeys}
      mapPickToId={(pick: SceSelectorPick) => pick.id}
      mapPickToChip={(pick) => ({
        id: pick.id,
        label: pick.label,
        description: pick.description,
      })}
      disabled={disabled}
      addButtonLabel="Teilnehmer/in hinzufügen"
      dialogTitle="Teilnehmer wählen"
      dialogDescription="Personen aus dem Verein suchen und zur Sitzung hinzufügen. Es werden keine Einladungen versendet."
      testIdPrefix="meeting-participant-picker"
      searchPlaceholder="Person im Verein suchen…"
      panelHost="sheet"
    />
  );
}
