/**
 * Deterministic round / phase section titles for Planung schedule presentation.
 */

type FixtureRoundContext = {
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  phaseLabel: string | null;
  groupLabel: string | null;
};

function isKnockoutStage(stageKey: string, phaseLabel: string | null): boolean {
  if (stageKey.toUpperCase().includes("KO")) return true;
  const phase = phaseLabel?.toLowerCase() ?? "";
  return phase.includes("k.o") || phase.includes("knock") || phase.includes("ausscheid");
}

export function formatKnockoutRoundLabel(roundIndex: number, maxRoundIndex: number): string {
  const distanceFromFinal = maxRoundIndex - roundIndex;
  switch (distanceFromFinal) {
    case 0:
      return "Finale";
    case 1:
      return "Halbfinale";
    case 2:
      return "Viertelfinale";
    case 3:
      return "Achtelfinale";
    default:
      return `Runde ${roundIndex + 1}`;
  }
}

export function buildPlanungRoundSectionKey(fixture: FixtureRoundContext): string {
  const groupPart = fixture.groupLabel ? fixture.groupLabel : "ALL";
  return `${fixture.stageKey}:${groupPart}:${fixture.roundIndex}`;
}

export function buildPlanungRoundSectionTitle(
  fixture: FixtureRoundContext,
  knockoutMaxRoundByStage: ReadonlyMap<string, number>,
): string {
  if (fixture.groupLabel) {
    return `${fixture.groupLabel} · Runde ${fixture.roundIndex + 1}`;
  }
  if (isKnockoutStage(fixture.stageKey, fixture.phaseLabel)) {
    const maxRound = knockoutMaxRoundByStage.get(fixture.stageKey) ?? fixture.roundIndex;
    return formatKnockoutRoundLabel(fixture.roundIndex, maxRound);
  }
  if (fixture.phaseLabel?.trim()) {
    return `${fixture.phaseLabel} · Runde ${fixture.roundIndex + 1}`;
  }
  return `Runde ${fixture.roundIndex + 1}`;
}

export function buildKnockoutMaxRoundIndexByStage(
  fixtures: readonly FixtureRoundContext[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const fixture of fixtures) {
    if (!isKnockoutStage(fixture.stageKey, fixture.phaseLabel)) continue;
    const prev = map.get(fixture.stageKey);
    if (prev == null || fixture.roundIndex > prev) {
      map.set(fixture.stageKey, fixture.roundIndex);
    }
  }
  return map;
}
