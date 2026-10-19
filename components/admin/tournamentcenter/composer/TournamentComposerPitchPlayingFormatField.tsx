"use client";

import { useMemo } from "react";
import {
  COMMON_PLAYING_FORMAT_PRESETS,
  formatPlayingFormatAccessibleLabel,
  PLAYING_FORMAT_UNSPECIFIED_CREATOR_LABEL,
} from "@/lib/tournament-scheduling/playing-format-presentation";
import {
  PLAYERS_PER_SIDE_MAX,
  PLAYERS_PER_SIDE_MIN,
} from "@/lib/tournament-scheduling/validate-tournament-pitch-playing-format";

type Props = {
  playersPerSide: number | null | undefined;
  onChange: (value: number | null) => void;
  id: string;
  testId?: string;
  disabled?: boolean;
};

const CUSTOM_SENTINEL = "custom";

function isPresetValue(n: number): boolean {
  return (COMMON_PLAYING_FORMAT_PRESETS as readonly number[]).includes(n);
}

function resolveSelectValue(playersPerSide: number | null): string {
  if (playersPerSide == null) return "";
  if (isPresetValue(playersPerSide)) return String(playersPerSide);
  return CUSTOM_SENTINEL;
}

export default function TournamentComposerPitchPlayingFormatField({
  playersPerSide,
  onChange,
  id,
  testId,
  disabled = false,
}: Props) {
  const normalized = playersPerSide ?? null;
  const selectValue = resolveSelectValue(normalized);
  const showCustom = selectValue === CUSTOM_SENTINEL;

  const selectOptions = useMemo(
    () => [
      { value: "", label: PLAYING_FORMAT_UNSPECIFIED_CREATOR_LABEL },
      ...COMMON_PLAYING_FORMAT_PRESETS.map((n) => ({
        value: String(n),
        label: formatPlayingFormatAccessibleLabel(n),
      })),
      { value: CUSTOM_SENTINEL, label: "Andere Anzahl…" },
    ],
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:max-w-xs sm:flex-1">
      <label htmlFor={id} className="fca-label">
        Spielform
      </label>
      <select
        id={id}
        className="fca-input"
        value={selectValue}
        data-testid={testId}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "") {
            onChange(null);
            return;
          }
          if (next === CUSTOM_SENTINEL) {
            if (normalized != null && !isPresetValue(normalized)) {
              onChange(normalized);
            }
            return;
          }
          onChange(Number(next));
        }}
      >
        {selectOptions.map((opt) => (
          <option key={opt.value || "unspecified"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {showCustom ? (
        <label className="block space-y-1">
          <span className="text-xs text-[var(--text-2)]">Spieler pro Seite</span>
          <input
            type="number"
            min={PLAYERS_PER_SIDE_MIN}
            max={PLAYERS_PER_SIDE_MAX}
            className="fca-input"
            value={normalized ?? ""}
            data-testid={testId ? `${testId}-custom` : undefined}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value === "") {
                onChange(null);
                return;
              }
              const parsed = Number(e.target.value);
              if (Number.isInteger(parsed)) {
                onChange(parsed);
              }
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
