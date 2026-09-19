"use client";

/**
 * TURNIERE-UX-02A — canonical Veranstalter selector (single Club Directory Verein).
 * Reuses ExternalClubPicker (same source as Teilnehmer → Externer Verein).
 */

import { ExternalClubPicker, type ExternalClubPickerResult } from "./ExternalClubPicker";

export type TournamentOrganizerClubFieldProps = {
  selected: ExternalClubPickerResult | null;
  onChange: (club: ExternalClubPickerResult | null) => void;
  disabled?: boolean;
  testId?: string;
  label?: string;
};

export default function TournamentOrganizerClubField({
  selected,
  onChange,
  disabled = false,
  testId = "tournament-organizer-club",
  label = "Veranstalter",
}: TournamentOrganizerClubFieldProps) {
  return (
    <div className="block space-y-2" data-testid={testId}>
      <span className="fca-label">{label}</span>
      <ExternalClubPicker
        selected={selected}
        onSelect={(club) => onChange(club)}
        onClearSelected={() => onChange(null)}
        disabled={disabled}
        placeholder="Verein suchen…"
        testId={`${testId}-picker`}
      />
    </div>
  );
}
