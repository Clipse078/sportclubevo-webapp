import type { ResolvedTemplateSide, TemplateParticipantSlotId, TemplateSideRef } from "./types";

const SLOT_ORDER: readonly TemplateParticipantSlotId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
];

export function participantSlotsForCount(count: number): TemplateParticipantSlotId[] {
  if (count < 2 || count > SLOT_ORDER.length) {
    throw new Error(`Unsupported template participant count: ${count}`);
  }
  return [...SLOT_ORDER.slice(0, count)];
}

/** Parse reference side tokens such as `A`, `B`, `A1`, `F2`. */
export function parseTemplateSideToken(token: string): TemplateSideRef {
  const trimmed = token.trim().toUpperCase();
  const match = /^([A-P])([0-9]+)?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid template side token: ${token}`);
  }
  const slot = match[1] as TemplateParticipantSlotId;
  const sub = match[2];
  if (!sub) {
    return { slot };
  }
  const subunitIndex = Number.parseInt(sub, 10);
  if (!Number.isInteger(subunitIndex) || subunitIndex < 1) {
    throw new Error(`Invalid template subunit index in token: ${token}`);
  }
  return { slot, subunitIndex };
}

export function formatTemplateSideRef(ref: TemplateSideRef): string {
  if (ref.subunitIndex === undefined) {
    return ref.slot;
  }
  return `${ref.slot}${ref.subunitIndex}`;
}

export function resolvedSideToTemplateRef(side: ResolvedTemplateSide): TemplateSideRef {
  if (side.subunitIndex === null || side.subunitIndex === undefined) {
    return { slot: side.slot };
  }
  return { slot: side.slot, subunitIndex: side.subunitIndex };
}
