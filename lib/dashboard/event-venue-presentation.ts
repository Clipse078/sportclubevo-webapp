/**
 * SCE-DASHBOARD-V3-03B — Human-friendly venue / facility presentation for
 * dashboard event cards. Presentation-only; stored allocation codes unchanged.
 */

import {
  getDressingRoomDisplayLabel,
  getPitchDisplayLabel,
} from "@/lib/facilities/display-helpers";

export type TodayEventVenueGroupKind = "location" | "pitch" | "dressing-rooms";

export type TodayEventVenueGroup = {
  kind: TodayEventVenueGroupKind;
  label: string;
};

export type TodayEventVenuePresentation = {
  groups: TodayEventVenueGroup[];
};

/**
 * Normalizes internal facility/resource codes for display when no registry
 * label exists. Does not change sporting meaning or stored values.
 */
export function normalizeFacilityDisplayLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const withoutFeldPrefix = trimmed.replace(/^Feld\s+/i, "");

  return withoutFeldPrefix
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+[a-z]?$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function resolvePitchPresentationLabel(
  code: string | null | undefined,
  resolvedLabel?: string | null,
): string | null {
  const fromRegistry = resolvedLabel?.trim() || getPitchDisplayLabel(code);
  if (fromRegistry) return fromRegistry;
  if (!code?.trim()) return null;
  return normalizeFacilityDisplayLabel(code);
}

export function resolveDressingRoomPresentationLabel(
  code: string | null | undefined,
  resolvedLabel?: string | null,
): string | null {
  const fromRegistry = resolvedLabel?.trim() || getDressingRoomDisplayLabel(code);
  if (fromRegistry) return fromRegistry;
  if (!code?.trim()) return null;
  return code.trim();
}

export function formatDressingRoomsPresentation(input: {
  homeCode?: string | null;
  awayCode?: string | null;
  homeLabel?: string | null;
  awayLabel?: string | null;
}): string | null {
  const parts = [
    resolveDressingRoomPresentationLabel(input.homeCode, input.homeLabel),
    resolveDressingRoomPresentationLabel(input.awayCode, input.awayLabel),
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function buildTodayEventVenuePresentation(input: {
  location?: string | null;
  pitchCode?: string | null;
  pitchLabel?: string | null;
  homeDressingRoomCode?: string | null;
  awayDressingRoomCode?: string | null;
  homeDressingRoomLabel?: string | null;
  awayDressingRoomLabel?: string | null;
}): TodayEventVenuePresentation {
  const groups: TodayEventVenueGroup[] = [];

  const location = input.location?.trim();
  if (location) {
    groups.push({ kind: "location", label: location });
  }

  const pitch = resolvePitchPresentationLabel(input.pitchCode, input.pitchLabel);
  if (pitch) {
    groups.push({ kind: "pitch", label: pitch });
  }

  const dressingRooms = formatDressingRoomsPresentation({
    homeCode: input.homeDressingRoomCode,
    awayCode: input.awayDressingRoomCode,
    homeLabel: input.homeDressingRoomLabel,
    awayLabel: input.awayDressingRoomLabel,
  });
  if (dressingRooms) {
    groups.push({ kind: "dressing-rooms", label: dressingRooms });
  }

  return { groups };
}

export function formatTodayEventVenueMeta(
  presentation: TodayEventVenuePresentation,
): string | undefined {
  if (presentation.groups.length === 0) return undefined;
  return presentation.groups.map((group) => group.label).join(" · ");
}
