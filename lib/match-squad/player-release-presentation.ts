import type { PlayerReleaseReason } from "@prisma/client";

export const PLAYER_RELEASE_REASON_OPTIONS: {
  value: PlayerReleaseReason;
  label: string;
}[] = [
  { value: "SPIELPRAXIS", label: "Spielpraxis" },
  { value: "ENTWICKLUNG", label: "Entwicklung" },
  { value: "KADERAUSGLEICH", label: "Kaderausgleich" },
  { value: "TORHUETER_UNTERSTUETZUNG", label: "Torhüter-Unterstützung" },
  { value: "COMEBACK_BELASTUNGSAUFBAU", label: "Comeback / Belastungsaufbau" },
  { value: "ANDERE", label: "Andere" },
];

export function playerReleaseReasonLabel(reason: PlayerReleaseReason): string {
  return (
    PLAYER_RELEASE_REASON_OPTIONS.find((option) => option.value === reason)?.label ??
    reason
  );
}

export function formatReleaseValidityRange(validFrom: Date, validUntil: Date): string {
  const fmt = new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${fmt.format(validFrom)}–${fmt.format(validUntil)}`;
}

export function formatMaxMinutesLabel(maxMinutes: number | null | undefined): string {
  if (maxMinutes == null) {
    return "Keine spezifische Begrenzung";
  }
  return `max. ${maxMinutes} Min.`;
}

export function formatReleaseActivityScopeLabel(input: {
  activityDate: Date;
  activityLabel: string;
  timezone?: string;
}): string {
  const fmt = new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: input.timezone ?? "Europe/Zurich",
  });
  return `Nur für: ${fmt.format(input.activityDate)} · ${input.activityLabel}`;
}
