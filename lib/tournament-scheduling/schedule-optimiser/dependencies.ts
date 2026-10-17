import { sortFixturesForScheduling } from "../feasibility/fixture-validation";
import type { FeasibilityFixtureRef } from "../feasibility/types";
import type { FeasibilitySearchState } from "../feasibility/complete-search";
import type { FeasibilityCandidateSlot } from "../feasibility/types";
import type {
  ScheduleFixtureDependency,
  TournamentScheduleOptimisationFixtureRef,
} from "./types";

export type ResolvedFixtureDependency =
  | { kind: "AFTER_FIXTURE_COMPLETE"; sourceFixtureId: string }
  | { kind: "AFTER_GROUP_STAGE_COMPLETE"; tournamentGroupId: string; groupFixtureIds: readonly string[] };

export function resolveFixtureDependencies(
  fixtures: readonly TournamentScheduleOptimisationFixtureRef[],
): Map<string, ResolvedFixtureDependency[]> {
  const fixtureIds = new Set(fixtures.map((f) => f.fixtureId));
  const groupFixtures = new Map<string, string[]>();
  for (const fixture of fixtures) {
    if (fixture.tournamentGroupId) {
      const list = groupFixtures.get(fixture.tournamentGroupId) ?? [];
      list.push(fixture.fixtureId);
      groupFixtures.set(fixture.tournamentGroupId, list);
    }
  }

  const byFixture = new Map<string, ResolvedFixtureDependency[]>();

  function add(fixtureId: string, dep: ResolvedFixtureDependency) {
    const list = byFixture.get(fixtureId) ?? [];
    const key =
      dep.kind === "AFTER_FIXTURE_COMPLETE"
        ? `${dep.kind}\0${dep.sourceFixtureId}`
        : `${dep.kind}\0${dep.tournamentGroupId}`;
    if (list.some((d) => dependencyKey(d) === key)) return;
    list.push(dep);
    byFixture.set(fixtureId, list);
  }

  for (const fixture of fixtures) {
    for (const explicit of fixture.dependencies ?? []) {
      if (explicit.kind === "AFTER_FIXTURE_COMPLETE") {
        if (fixtureIds.has(explicit.sourceFixtureId)) {
          add(fixture.fixtureId, explicit);
        }
      } else {
        const ids = groupFixtures.get(explicit.tournamentGroupId) ?? [];
        add(fixture.fixtureId, {
          kind: "AFTER_GROUP_STAGE_COMPLETE",
          tournamentGroupId: explicit.tournamentGroupId,
          groupFixtureIds: ids,
        });
      }
    }

    for (const side of fixture.sideSources ?? []) {
      if (side.sourceType === "WINNER_OF_FIXTURE" && side.sourceFixtureId) {
        if (fixtureIds.has(side.sourceFixtureId)) {
          add(fixture.fixtureId, {
            kind: "AFTER_FIXTURE_COMPLETE",
            sourceFixtureId: side.sourceFixtureId,
          });
        }
      }
      if (side.sourceType === "QUALIFICATION_REFERENCE" && side.sourceGroupId) {
        const ids = groupFixtures.get(side.sourceGroupId) ?? [];
        add(fixture.fixtureId, {
          kind: "AFTER_GROUP_STAGE_COMPLETE",
          tournamentGroupId: side.sourceGroupId,
          groupFixtureIds: ids,
        });
      }
    }
  }

  return byFixture;
}

function dependencyKey(dep: ResolvedFixtureDependency): string {
  return dep.kind === "AFTER_FIXTURE_COMPLETE"
    ? `${dep.kind}\0${dep.sourceFixtureId}`
    : `${dep.kind}\0${dep.tournamentGroupId}`;
}

/**
 * Topological order with deterministic tie-breaking (stage → round → slot → fixture id).
 */
export function sortFixturesForOptimisation(
  fixtures: readonly FeasibilityFixtureRef[],
  dependencies: Map<string, ResolvedFixtureDependency[]>,
): FeasibilityFixtureRef[] {
  const sorted = sortFixturesForScheduling(fixtures);
  const indexById = new Map(sorted.map((f, i) => [f.fixtureId, i]));
  const inDegree = new Map<string, number>();
  const edges = new Map<string, string[]>();

  for (const fixture of sorted) {
    inDegree.set(fixture.fixtureId, 0);
    edges.set(fixture.fixtureId, []);
  }

  for (const fixture of sorted) {
    const deps = dependencies.get(fixture.fixtureId) ?? [];
    const precursors = new Set<string>();
    for (const dep of deps) {
      if (dep.kind === "AFTER_FIXTURE_COMPLETE") {
        precursors.add(dep.sourceFixtureId);
      } else {
        for (const gid of dep.groupFixtureIds) {
          if (gid !== fixture.fixtureId) precursors.add(gid);
        }
      }
    }
    for (const precursorId of precursors) {
      if (!indexById.has(precursorId)) continue;
      edges.get(precursorId)!.push(fixture.fixtureId);
      inDegree.set(fixture.fixtureId, (inDegree.get(fixture.fixtureId) ?? 0) + 1);
    }
  }

  const queue = sorted.filter((f) => (inDegree.get(f.fixtureId) ?? 0) === 0);
  const result: FeasibilityFixtureRef[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => (indexById.get(a.fixtureId)! - indexById.get(b.fixtureId)!));
    const next = queue.shift()!;
    result.push(next);
    for (const childId of edges.get(next.fixtureId) ?? []) {
      const deg = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, deg);
      if (deg === 0) {
        const child = sorted.find((f) => f.fixtureId === childId);
        if (child) queue.push(child);
      }
    }
  }

  if (result.length !== sorted.length) {
    return sorted;
  }
  return result;
}

export function satisfiesScheduleDependencies(params: {
  fixtureId: string;
  slot: FeasibilityCandidateSlot;
  state: FeasibilitySearchState;
  dependencies: Map<string, ResolvedFixtureDependency[]>;
}): boolean {
  const rules = params.dependencies.get(params.fixtureId) ?? [];
  for (const rule of rules) {
    if (rule.kind === "AFTER_FIXTURE_COMPLETE") {
      const src = params.state.assignments.get(rule.sourceFixtureId);
      if (!src) return false;
      if (params.slot.startUtcMs < src.resourceEndUtcMs) return false;
    } else {
      for (const groupFixtureId of rule.groupFixtureIds) {
        const src = params.state.assignments.get(groupFixtureId);
        if (!src) return false;
        if (params.slot.startUtcMs < src.resourceEndUtcMs) return false;
      }
    }
  }
  return true;
}
