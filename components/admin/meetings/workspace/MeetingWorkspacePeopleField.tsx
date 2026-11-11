"use client";

import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";

type Props = {
  label?: string;
  selected: PersonPickerResult | null;
  onSelect: (person: PersonPickerResult) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function MeetingWorkspacePeopleField({
  label = "Person",
  selected,
  onSelect,
  onClear,
  disabled,
}: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">{label}</label>
      <PeoplePicker
        selected={selected}
        onSelect={onSelect}
        onClearSelected={onClear}
        placeholder="Person im Verein suchen…"
        disabled={disabled}
      />
    </div>
  );
}

export function personPickerFromIds(
  personId: string | null | undefined,
  displayName: string | null | undefined,
): PersonPickerResult | null {
  if (!personId) return null;
  const name = (displayName ?? "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    id: personId,
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || "",
    displayName: name || null,
    email: null,
    phone: null,
  };
}

export function personDisplayLabel(person: PersonPickerResult): string {
  return person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}
