"use client";

import { useMemo, useState } from "react";
import {
  SceInlineMultiPersonPicker,
  type SceInlineMultiPersonChip,
} from "@/components/sce/list-selector/SceInlineMultiPersonPicker";
import { meetingPersonFallbackLabel, looksLikeOpaquePersonId } from "@/lib/meetings/meeting-person-display";

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
  const [addedKnown, setAddedKnown] = useState<Record<string, SceInlineMultiPersonChip>>({});

  const knownById = useMemo(() => {
    const map = new Map<string, SceInlineMultiPersonChip>();
    for (const person of initialKnown) {
      map.set(person.personId, {
        id: person.personId,
        label: person.label,
        description: person.description ?? null,
      });
    }
    for (const [id, chip] of Object.entries(addedKnown)) {
      map.set(id, chip);
    }
    for (const id of selectedPersonIds) {
      if (map.has(id)) continue;
      if (looksLikeOpaquePersonId(id)) {
        map.set(id, { id, label: meetingPersonFallbackLabel(id) });
      }
    }
    return map;
  }, [initialKnown, addedKnown, selectedPersonIds]);

  function handleSelectionKnown(entries: SceInlineMultiPersonChip[]) {
    setAddedKnown((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        next[entry.id] = entry;
      }
      return next;
    });
  }

  return (
    <SceInlineMultiPersonPicker
      label={label}
      hideLabel={false}
      selectedIds={selectedPersonIds}
      onSelectedIdsChange={onSelectedPersonIdsChange}
      onSelectionKnown={handleSelectionKnown}
      knownById={knownById}
      disabled={disabled}
      testIdPrefix="meeting-participant-picker"
      placeholder="Person im Verein suchen…"
    />
  );
}
