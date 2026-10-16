import { compareParticipantId } from "../fixtures/ordering";
import type { FeasibilityDiagnostic, FeasibilityFixtureRef, FeasibilityParticipantRef } from "./types";

export interface FixtureValidationOutcome {
  ok: boolean;
  diagnostics: FeasibilityDiagnostic[];
}

function diagnostic(
  code: FeasibilityDiagnostic["code"],
  context?: FeasibilityDiagnostic["context"],
): FeasibilityDiagnostic {
  return { code, constraintId: "H8", context };
}

/**
 * Validates fixture set before feasibility analysis (generator-agnostic structural checks).
 */
export function validateFeasibilityFixtureSet(
  fixtures: readonly FeasibilityFixtureRef[],
  participants: readonly FeasibilityParticipantRef[],
): FixtureValidationOutcome {
  const diagnostics: FeasibilityDiagnostic[] = [];

  if (fixtures.length === 0) {
    diagnostics.push({ code: "FIXTURE_SET.EMPTY", constraintId: "H12" });
    return { ok: false, diagnostics };
  }

  const participantIds = new Set(participants.map((p) => p.participantId));

  const roundSlotKeys = new Set<string>();
  const fixtureIds = new Set<string>();

  for (const fixture of fixtures) {
    if (fixtureIds.has(fixture.fixtureId)) {
      diagnostics.push(
        diagnostic("FIXTURE_SET.INVALID", {
          reason: "DUPLICATE_FIXTURE_ID",
          fixtureId: fixture.fixtureId,
        }),
      );
    }
    fixtureIds.add(fixture.fixtureId);

    if (fixture.sideAParticipantId === fixture.sideBParticipantId) {
      diagnostics.push(
        diagnostic("FIXTURE_SET.INVALID", {
          reason: "SELF_PLAY",
          fixtureId: fixture.fixtureId,
        }),
      );
    }

    for (const participantId of [fixture.sideAParticipantId, fixture.sideBParticipantId]) {
      if (!participantIds.has(participantId)) {
        diagnostics.push(
          diagnostic("FIXTURE_SET.INVALID", {
            reason: "PARTICIPANT_NOT_IN_TOURNAMENT",
            fixtureId: fixture.fixtureId,
            participantId,
          }),
        );
      }
    }

    const slotKey = `${fixture.stageKey}\0${fixture.tournamentGroupId ?? ""}\0${fixture.roundIndex}\0${fixture.slotIndexInRound}`;
    if (roundSlotKeys.has(slotKey)) {
      diagnostics.push(
        diagnostic("FIXTURE_SET.INVALID", {
          reason: "DUPLICATE_ROUND_SLOT",
          stageKey: fixture.stageKey,
          roundIndex: fixture.roundIndex,
          slotIndexInRound: fixture.slotIndexInRound,
        }),
      );
    }
    roundSlotKeys.add(slotKey);
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }
  return { ok: true, diagnostics: [] };
}

export function sortFixturesForScheduling(
  fixtures: readonly FeasibilityFixtureRef[],
): FeasibilityFixtureRef[] {
  return [...fixtures].sort((a, b) => {
    if (a.stageKey !== b.stageKey) return compareParticipantId(a.stageKey, b.stageKey);
    if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
    if (a.slotIndexInRound !== b.slotIndexInRound) {
      return a.slotIndexInRound - b.slotIndexInRound;
    }
    return compareParticipantId(a.fixtureId, b.fixtureId);
  });
}
