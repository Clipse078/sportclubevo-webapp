import type { SportingActivityPresentation } from "./types";

function normalizeSegmentKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[·•|/\\]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .trim();
}

function splitFixtureParticipants(fixtureLine: string): string[] {
  const parts = fixtureLine
    .split(/\s*(?:vs|–|—|-)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts;
}

/**
 * Tokens already communicated by the compact primary line (identity / fixture).
 * Used to drop redundant secondary metadata segments deterministically.
 */
export function collectCompactPrimaryCoverageKeys(
  presentation: SportingActivityPresentation,
  primaryText: string,
): Set<string> {
  const keys = new Set<string>();

  const add = (value: string | null | undefined) => {
    if (!value?.trim()) return;
    keys.add(normalizeSegmentKey(value));
  };

  add(primaryText);

  const team = presentation.team?.name?.trim();
  if (team) add(team);

  const opponent = presentation.participants?.opponentName?.trim();
  if (opponent) add(opponent);

  const fixture = presentation.participants?.fixtureLine?.trim();
  if (fixture) {
    add(fixture);
    for (const participant of splitFixtureParticipants(fixture)) {
      add(participant);
    }
  }

  const title = presentation.identity.title.trim();
  if (team && title) {
    const titleKey = normalizeSegmentKey(title);
    const teamKey = normalizeSegmentKey(team);
    if (titleKey.includes(teamKey)) {
      keys.add(teamKey);
    }
  }

  return keys;
}

function isSegmentCoveredByPrimary(
  segment: string,
  primaryText: string,
  coverageKeys: Set<string>,
): boolean {
  const segmentKey = normalizeSegmentKey(segment);
  if (!segmentKey) return true;
  if (coverageKeys.has(segmentKey)) return true;

  const primaryKey = normalizeSegmentKey(primaryText);
  if (segmentKey.length >= 3 && primaryKey.includes(segmentKey)) {
    return true;
  }

  return false;
}

/**
 * Removes metadata segments already represented by compact primary identity.
 */
export function filterCompactMetadataPartsAgainstPrimary(
  presentation: SportingActivityPresentation,
  primaryText: string,
  parts: readonly string[],
): string[] {
  const coverageKeys = collectCompactPrimaryCoverageKeys(presentation, primaryText);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = normalizeSegmentKey(trimmed);
    if (!key || seen.has(key)) continue;
    if (isSegmentCoveredByPrimary(trimmed, primaryText, coverageKeys)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}
