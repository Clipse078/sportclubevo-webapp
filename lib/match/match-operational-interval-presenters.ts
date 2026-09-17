import type {
  MatchOperationalDurationSource,
  MatchOperationalEndSource,
} from "./resolve-match-operational-interval";

export function formatDurationMinutesDe(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} Min.`;
  }
  if (minutes === 0) {
    return hours === 1 ? "1 Std." : `${hours} Std.`;
  }
  const hourPart = hours === 1 ? "1 Std." : `${hours} Std.`;
  return `${hourPart} ${minutes} Min.`;
}

export function formatAutomaticEndProvenanceLabel(args: {
  endSource: MatchOperationalEndSource;
  durationSource: MatchOperationalDurationSource;
  durationMinutes: number;
}): string {
  if (args.endSource === "SCE_OVERRIDE") {
    return "Manuell gesetzt";
  }
  if (args.endSource === "AUTHORITATIVE") {
    return "Provider";
  }
  const durationLabel = formatDurationMinutesDe(args.durationMinutes);
  if (args.durationSource === "CLUB_DEFAULT" || args.endSource === "CONFIGURED_DEFAULT") {
    return `Automatisch · Clubstandard ${durationLabel}`;
  }
  return `Automatisch · Standard ${durationLabel}`;
}
