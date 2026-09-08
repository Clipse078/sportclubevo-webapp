/**
 * SCE-DASHBOARD-V3-03B — Human-friendly venue / facility presentation for
 * dashboard event cards. Presentation-only; stored allocation codes unchanged.
 *
 * SCE-DASHBOARD-V3-03G — Home/away dressing-room labels (Heim/Gast) when
 * allocation semantics explicitly identify sides; neutral/participant labels
 * otherwise. Never inferred from array order.
 */

import {
  getDressingRoomDisplayLabel,
  getPitchDisplayLabel,
} from "@/lib/facilities/display-helpers";

export type TodayEventVenueGroupKind = "location" | "pitch" | "dressing-rooms";

export type DressingRoomSidePresentation = {
  /** Semantic role label such as Heim, Gast, or a tournament participant name. */
  roleLabel?: string;
  rooms: string[];
};

export type DressingRoomVenueSemantics = "home-away" | "neutral" | "participant";

export type DressingRoomVenueDetails = {
  semantics: DressingRoomVenueSemantics;
  sides: DressingRoomSidePresentation[];
  ariaLabel: string;
};

export type TodayEventVenueGroup = {
  kind: TodayEventVenueGroupKind;
  label: string;
  ariaLabel?: string;
  dressingRooms?: DressingRoomVenueDetails;
};

export type TodayEventVenuePresentation = {
  groups: TodayEventVenueGroup[];
};

export type DressingRoomAllocationInput = {
  code?: string | null;
  label?: string | null;
};

export type ParticipantDressingRoomInput = {
  participantLabel: string;
  rooms: DressingRoomAllocationInput[];
};

const DRESSING_ROOM_HOME_LABEL = "Heim";
const DRESSING_ROOM_AWAY_LABEL = "Gast";
const DRESSING_ROOM_ARIA_NOUN = "Garderobe";
const MULTI_ROOM_SEPARATOR = " / ";
const SIDE_SEPARATOR = " · ";

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

function resolveDressingRoomAllocationLabels(
  allocations: readonly DressingRoomAllocationInput[],
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const allocation of allocations) {
    const label = resolveDressingRoomPresentationLabel(
      allocation.code,
      allocation.label,
    );
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  return labels;
}

function resolveDressingRoomAllocationsFromFields(input: {
  code?: string | null;
  label?: string | null;
  allocations?: readonly DressingRoomAllocationInput[];
}): string[] {
  if (input.allocations && input.allocations.length > 0) {
    return resolveDressingRoomAllocationLabels(input.allocations);
  }

  const single = resolveDressingRoomPresentationLabel(input.code, input.label);
  return single ? [single] : [];
}

function joinRoomLabels(rooms: readonly string[]): string {
  return rooms.join(MULTI_ROOM_SEPARATOR);
}

function formatDressingRoomSide(roleLabel: string | undefined, rooms: readonly string[]): string {
  const roomText = joinRoomLabels(rooms);
  return roleLabel ? `${roleLabel} ${roomText}` : roomText;
}

function formatDressingRoomAriaSide(
  roleLabel: string | undefined,
  rooms: readonly string[],
): string {
  const roomText = rooms.join(", ");
  if (!roleLabel) return `${DRESSING_ROOM_ARIA_NOUN} ${roomText}`;
  return `${roleLabel} ${DRESSING_ROOM_ARIA_NOUN} ${roomText}`;
}

function buildDressingRoomVenueDetails(input: {
  semantics: DressingRoomVenueSemantics;
  sides: DressingRoomSidePresentation[];
}): DressingRoomVenueDetails | null {
  const sides = input.sides
    .map((side) => ({
      roleLabel: side.roleLabel?.trim() || undefined,
      rooms: side.rooms.filter(Boolean),
    }))
    .filter((side) => side.rooms.length > 0);

  if (sides.length === 0) return null;

  const ariaLabel = sides
    .map((side) => formatDressingRoomAriaSide(side.roleLabel, side.rooms))
    .join(", ");

  return {
    semantics: input.semantics,
    sides,
    ariaLabel,
  };
}

export function formatDressingRoomsPresentation(input: {
  eventType?: "MATCH" | "TRAINING" | "TOURNAMENT" | "OTHER" | "VACATION_PERIOD" | "MEETING";
  homeCode?: string | null;
  awayCode?: string | null;
  homeLabel?: string | null;
  awayLabel?: string | null;
  homeAllocations?: readonly DressingRoomAllocationInput[];
  awayAllocations?: readonly DressingRoomAllocationInput[];
  participantAllocations?: readonly ParticipantDressingRoomInput[];
}): DressingRoomVenueDetails | null {
  const participantSides =
    input.participantAllocations
      ?.map((participant) => ({
        roleLabel: participant.participantLabel.trim(),
        rooms: resolveDressingRoomAllocationLabels(participant.rooms),
      }))
      .filter((side) => side.roleLabel.length > 0 && side.rooms.length > 0) ?? [];

  if (participantSides.length > 0) {
    return buildDressingRoomVenueDetails({
      semantics: "participant",
      sides: participantSides,
    });
  }

  const homeRooms = resolveDressingRoomAllocationsFromFields({
    code: input.homeCode,
    label: input.homeLabel,
    allocations: input.homeAllocations,
  });
  const awayRooms = resolveDressingRoomAllocationsFromFields({
    code: input.awayCode,
    label: input.awayLabel,
    allocations: input.awayAllocations,
  });

  if (input.eventType === "MATCH") {
    const sides: DressingRoomSidePresentation[] = [];
    if (homeRooms.length > 0) {
      sides.push({ roleLabel: DRESSING_ROOM_HOME_LABEL, rooms: homeRooms });
    }
    if (awayRooms.length > 0) {
      sides.push({ roleLabel: DRESSING_ROOM_AWAY_LABEL, rooms: awayRooms });
    }
    return buildDressingRoomVenueDetails({ semantics: "home-away", sides });
  }

  const neutralRooms = [...homeRooms, ...awayRooms];
  if (neutralRooms.length === 0) return null;

  return buildDressingRoomVenueDetails({
    semantics: "neutral",
    sides: [{ rooms: neutralRooms }],
  });
}

export function buildTodayEventVenuePresentation(input: {
  eventType?: "MATCH" | "TRAINING" | "TOURNAMENT" | "OTHER" | "VACATION_PERIOD" | "MEETING";
  location?: string | null;
  pitchCode?: string | null;
  pitchLabel?: string | null;
  homeDressingRoomCode?: string | null;
  awayDressingRoomCode?: string | null;
  homeDressingRoomLabel?: string | null;
  awayDressingRoomLabel?: string | null;
  homeDressingRoomAllocations?: readonly DressingRoomAllocationInput[];
  awayDressingRoomAllocations?: readonly DressingRoomAllocationInput[];
  participantDressingRoomAllocations?: readonly ParticipantDressingRoomInput[];
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
    eventType: input.eventType,
    homeCode: input.homeDressingRoomCode,
    awayCode: input.awayDressingRoomCode,
    homeLabel: input.homeDressingRoomLabel,
    awayLabel: input.awayDressingRoomLabel,
    homeAllocations: input.homeDressingRoomAllocations,
    awayAllocations: input.awayDressingRoomAllocations,
    participantAllocations: input.participantDressingRoomAllocations,
  });

  if (dressingRooms) {
    groups.push({
      kind: "dressing-rooms",
      label: dressingRooms.sides
        .map((side) => formatDressingRoomSide(side.roleLabel, side.rooms))
        .join(SIDE_SEPARATOR),
      ariaLabel: dressingRooms.ariaLabel,
      dressingRooms,
    });
  }

  return { groups };
}

export function formatTodayEventVenueMeta(
  presentation: TodayEventVenuePresentation,
): string | undefined {
  if (presentation.groups.length === 0) return undefined;
  return presentation.groups.map((group) => group.label).join(" · ");
}
