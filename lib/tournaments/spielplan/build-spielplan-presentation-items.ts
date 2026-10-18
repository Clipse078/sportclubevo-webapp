import type { TournamentPlanungScheduleSection } from "@/lib/tournaments/planung/types";
import { formatPlanungBreakScopeLabel } from "@/lib/tournaments/planung/planung-schedule-sections";
import type {
  TournamentSpielplanFixturePresentation,
  TournamentSpielplanPresentationItem,
} from "./types";

function formatTimeRange(startUtc: string, endUtc: string, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  const start = new Date(startUtc).toLocaleTimeString("de-CH", opts);
  const end = new Date(endUtc).toLocaleTimeString("de-CH", opts);
  return `${start}–${end}`;
}

function pitchSummaryLabel(labels: readonly string[]): string | null {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length === 0) return null;
  return unique.join(" & ");
}

function roundGroupFromSection(
  section: TournamentPlanungScheduleSection,
  fixtureById: ReadonlyMap<string, TournamentSpielplanFixturePresentation>,
  timezone: string,
): TournamentSpielplanPresentationItem | null {
  const fixtures = section.entries
    .filter((entry) => entry.kind === "FIXTURE")
    .map((entry) => fixtureById.get(entry.fixtureId))
    .filter((f): f is TournamentSpielplanFixturePresentation => Boolean(f));

  if (fixtures.length === 0) return null;

  const sortedFixtures = [...fixtures].sort(
    (a, b) =>
      Date.parse(a.startUtc) - Date.parse(b.startUtc) ||
      a.pitchLabel.localeCompare(b.pitchLabel, "de"),
  );

  const startMs = Math.min(...sortedFixtures.map((f) => Date.parse(f.startUtc)));
  const endMs = Math.max(...sortedFixtures.map((f) => Date.parse(f.endUtc)));

  return {
    kind: "ROUND_GROUP",
    group: {
      sectionId: section.sectionId,
      title: section.title,
      timeRangeLabel: formatTimeRange(
        new Date(startMs).toISOString(),
        new Date(endMs).toISOString(),
        timezone,
      ),
      pitchSummaryLabel: pitchSummaryLabel(sortedFixtures.map((f) => f.pitchLabel)),
      fixtureCount: sortedFixtures.length,
      fixtures: sortedFixtures,
    },
  };
}

export function buildSpielplanPresentationItems(input: {
  scheduleSections: readonly TournamentPlanungScheduleSection[];
  fixtures: readonly TournamentSpielplanFixturePresentation[];
  timezone: string;
  pitchLabelById: ReadonlyMap<string, string>;
}): TournamentSpielplanPresentationItem[] {
  const fixtureById = new Map(input.fixtures.map((f) => [f.fixtureId, f]));
  const items: TournamentSpielplanPresentationItem[] = [];

  for (const section of input.scheduleSections) {
    if (section.sectionId.startsWith("break:")) {
      const br = section.entries.find((e) => e.kind === "BREAK");
      if (!br || br.kind !== "BREAK") continue;
      const pitchLabels = br.pitchIds.map((id) => input.pitchLabelById.get(id) ?? "Feld");
      items.push({
        kind: "SCHEDULE_BREAK",
        break: {
          breakId: br.breakId,
          scope: br.scope,
          timeLabel: formatTimeRange(br.startUtc, br.endUtc, input.timezone),
          label: br.label,
          scopeLabel: formatPlanungBreakScopeLabel(br.scope, pitchLabels),
        },
      });
      continue;
    }

    const groupItem = roundGroupFromSection(section, fixtureById, input.timezone);
    if (groupItem) items.push(groupItem);
  }

  if (items.length === 0 && input.fixtures.length > 0) {
    const sortedFixtures = [...input.fixtures].sort(
      (a, b) =>
        Date.parse(a.startUtc) - Date.parse(b.startUtc) ||
        a.pitchLabel.localeCompare(b.pitchLabel, "de"),
    );
    const startMs = Math.min(...sortedFixtures.map((f) => Date.parse(f.startUtc)));
    const endMs = Math.max(...sortedFixtures.map((f) => Date.parse(f.endUtc)));
    items.push({
      kind: "ROUND_GROUP",
      group: {
        sectionId: "fallback:all-fixtures",
        title: "Spielplan",
        timeRangeLabel: formatTimeRange(
          new Date(startMs).toISOString(),
          new Date(endMs).toISOString(),
          input.timezone,
        ),
        pitchSummaryLabel: pitchSummaryLabel(sortedFixtures.map((f) => f.pitchLabel)),
        fixtureCount: sortedFixtures.length,
        fixtures: sortedFixtures,
      },
    });
  }

  return items;
}
