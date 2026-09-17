/**
 * PLANNING-HUB-03D — fixed placeholder activity geometry (no randomness / hydration drift).
 * Positions are percentages within the day column (top%, height%).
 */

export type PlannerPlaceholderBlock = {
  dayIndex: number; // 0 = Mon … 6 = Sun
  topPct: number;
  heightPct: number;
  tint: "neutral" | "training" | "match" | "event";
};

/** Grassroots-club week density — abstract blocks only, no fake labels. */
export const CALENDAR_PLACEHOLDER_BLOCKS: readonly PlannerPlaceholderBlock[] = [
  { dayIndex: 5, topPct: 8, heightPct: 14, tint: "event" },
  { dayIndex: 0, topPct: 52, heightPct: 18, tint: "training" },
  { dayIndex: 1, topPct: 48, heightPct: 16, tint: "training" },
  { dayIndex: 2, topPct: 55, heightPct: 20, tint: "match" },
  { dayIndex: 3, topPct: 50, heightPct: 17, tint: "training" },
  { dayIndex: 4, topPct: 58, heightPct: 15, tint: "training" },
  { dayIndex: 4, topPct: 38, heightPct: 12, tint: "match" },
] as const;

export const RESOURCE_ROW_PLACEHOLDER_COUNT = 6;

export const LISTE_ROW_PLACEHOLDER_COUNT = 8;
