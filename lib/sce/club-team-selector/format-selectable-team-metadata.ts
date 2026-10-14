import type { SceSelectableTeam } from "./types";

const GENDER_DISPLAY: Record<string, string> = {
  male: "Herren",
  m: "Herren",
  men: "Herren",
  männlich: "Herren",
  maennlich: "Herren",
  female: "Frauen",
  f: "Frauen",
  women: "Frauen",
  weiblich: "Frauen",
  mixed: "Mixed",
  mix: "Mixed",
  boys: "Junioren M",
  girls: "Junioren F",
};

function normalizeDisplayToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const mapped = GENDER_DISPLAY[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}

function splitCategoryLabel(label: string): string[] {
  return label
    .split(/[/|·]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenKey(token: string): string {
  return normalizeDisplayToken(token).toLowerCase();
}

/**
 * Presentation-only secondary line for team rows — deduplicates overlapping
 * category / age / gender tokens and prefers German gender labels.
 */
export function formatSelectableTeamMetadata(team: SceSelectableTeam): string | null {
  const seen = new Set<string>();
  const ordered: string[] = [];

  function add(raw: string | null | undefined) {
    if (!raw?.trim()) return;
    for (const piece of splitCategoryLabel(raw)) {
      const display = normalizeDisplayToken(piece);
      if (!display) continue;
      const key = tokenKey(display);
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(display);
    }
  }

  add(team.categoryLabel);
  add(team.ageGroup);
  add(team.genderGroup);

  return ordered.length > 0 ? ordered.join(" · ") : null;
}
