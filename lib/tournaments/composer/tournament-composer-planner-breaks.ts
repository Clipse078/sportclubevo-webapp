import {
  utcInstantToDateTimeLocalValue,
  parseTenantLocalDateTimeInput,
} from "@/lib/events/tenant-local-datetime";
import {
  normalizeTimeInput,
  splitDateTimeLocalValue,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";
import type { TournamentComposerBreakDraft } from "./tournament-composer-planner-types";

/** Legacy 01H-R1 drafts stored full datetime-local on breaks. */
export type LegacyComposerBreakDraft = TournamentComposerBreakDraft & {
  startAt?: string;
  endAt?: string;
};

export function normalizeComposerBreakDraft(raw: LegacyComposerBreakDraft): TournamentComposerBreakDraft {
  if (raw.startLocalTime && raw.durationMinutes > 0) {
    return {
      localId: raw.localId,
      label: raw.label ?? "Pause",
      startLocalTime: raw.startLocalTime,
      durationMinutes: raw.durationMinutes,
      scope: raw.scope ?? "ALL_PITCHES",
      tournamentPitchLocalIds: raw.tournamentPitchLocalIds ?? [],
      fieldSelectionAdvanced: raw.fieldSelectionAdvanced ?? raw.scope === "SELECTED_PITCHES",
    };
  }

  const legacyStart = raw.startAt?.trim();
  const legacyEnd = raw.endAt?.trim();
  if (legacyStart && legacyEnd) {
    const startParts = splitDateTimeLocalValue(legacyStart);
    const endParts = splitDateTimeLocalValue(legacyEnd);
    const startTime = startParts ? normalizeTimeInput(startParts.time) : { ok: false as const };
    if (startParts && endParts && startTime.ok) {
      const startMs = new Date(`${startParts.isoDateKey}T${startTime.normalized}`).getTime();
      const endMs = new Date(`${endParts.isoDateKey}T${endParts.time}`).getTime();
      const durationMinutes =
        endMs > startMs ? Math.max(1, Math.round((endMs - startMs) / 60_000)) : 15;
      return {
        localId: raw.localId,
        label: raw.label ?? "Pause",
        startLocalTime: startTime.normalized,
        durationMinutes,
        scope: raw.scope ?? "ALL_PITCHES",
        tournamentPitchLocalIds: raw.tournamentPitchLocalIds ?? [],
        fieldSelectionAdvanced: raw.scope === "SELECTED_PITCHES",
      };
    }
  }

  return {
    localId: raw.localId,
    label: raw.label ?? "Pause",
    startLocalTime: raw.startLocalTime ?? "",
    durationMinutes: raw.durationMinutes ?? 15,
    scope: raw.scope ?? "ALL_PITCHES",
    tournamentPitchLocalIds: raw.tournamentPitchLocalIds ?? [],
    fieldSelectionAdvanced: raw.fieldSelectionAdvanced ?? false,
  };
}

export function createDefaultComposerBreakDraft(localId: string): TournamentComposerBreakDraft {
  return {
    localId,
    label: "Pause",
    startLocalTime: "",
    durationMinutes: 15,
    scope: "ALL_PITCHES",
    tournamentPitchLocalIds: [],
    fieldSelectionAdvanced: false,
  };
}

export function combineTournamentStartDateWithLocalTime(
  tournamentStartAt: string,
  startLocalTime: string,
  timeZone?: string,
): string | null {
  const timeParsed = normalizeTimeInput(startLocalTime);
  if (!timeParsed.ok) {
    return null;
  }

  const localStartParts = splitDateTimeLocalValue(tournamentStartAt);
  if (localStartParts) {
    return `${localStartParts.isoDateKey}T${timeParsed.normalized}`;
  }

  if (timeZone) {
    const instant = parseTenantLocalDateTimeInput(tournamentStartAt, timeZone);
    if (!instant) {
      return null;
    }
    const localStart = utcInstantToDateTimeLocalValue(instant, timeZone);
    const dateParts = splitDateTimeLocalValue(localStart);
    if (!dateParts) {
      return null;
    }
    return `${dateParts.isoDateKey}T${timeParsed.normalized}`;
  }

  return null;
}

export function resolveComposerBreakDateTimes(
  br: TournamentComposerBreakDraft,
  tournamentStartAt: string,
  timeZone?: string,
): { startAt: string; endAt: string } | null {
  const startCombined = combineTournamentStartDateWithLocalTime(
    tournamentStartAt,
    br.startLocalTime,
    timeZone,
  );
  if (!startCombined || br.durationMinutes <= 0) {
    return null;
  }

  if (timeZone) {
    const startInstant = parseTenantLocalDateTimeInput(startCombined, timeZone);
    if (!startInstant) {
      return null;
    }
    const endInstant = new Date(startInstant.getTime() + br.durationMinutes * 60_000);
    const endAt = utcInstantToDateTimeLocalValue(endInstant, timeZone);
    if (!endAt) {
      return null;
    }
    return { startAt: startCombined, endAt };
  }

  const startMs = new Date(startCombined).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }
  const endMs = startMs + br.durationMinutes * 60_000;
  const end = new Date(endMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endAt = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return { startAt: startCombined, endAt };
}

export function formatComposerBreakSummary(
  br: TournamentComposerBreakDraft,
  pitchLabelsById: Map<string, string>,
): string {
  const endTime = (() => {
    if (!br.startLocalTime) return "—";
    const parsed = normalizeTimeInput(br.startLocalTime);
    if (!parsed.ok) return "—";
    const [h, m] = parsed.normalized.split(":").map(Number);
    const total = h * 60 + m + br.durationMinutes;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  const scopeLabel =
    br.scope === "ALL_PITCHES" || !br.fieldSelectionAdvanced
      ? "alle Felder"
      : br.tournamentPitchLocalIds
          .map((id) => pitchLabelsById.get(id) ?? id)
          .join(", ") || "ausgewählte Felder";

  const begin = br.startLocalTime || "—";
  return `${br.label || "Pause"} · ${begin}–${endTime} · ${scopeLabel}`;
}
