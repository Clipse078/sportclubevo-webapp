/**
 * Persists planner configuration for an existing HOME tournament (no recreation required).
 */
import { prisma } from "@/lib/db/prisma";
import { requireTenantOrganisedTournament } from "@/lib/tournament-scheduling/internal/require-tenant-organised-tournament";
import { listTournamentBreaks } from "@/lib/tournament-scheduling/tournament-break-service";
import { listTournamentPitches, updateTournamentPitch, createTournamentPitch } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { persistTournamentPlannerFromComposer } from "@/lib/tournaments/composer/persist-tournament-planner-from-composer";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import { validateHomePlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-validation";
import { TournamentPlannerSetupNotAllowedError } from "./planner-setup-errors";

export async function persistTournamentPlannerSetupForExistingTournament(input: {
  tenantId: string;
  tournamentId: string;
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
}): Promise<void> {
  await requireTenantOrganisedTournament(input.tenantId, input.tournamentId);

  const [fixtureCount, assignmentCount] = await Promise.all([
    prisma.tournamentFixture.count({
      where: { tenantId: input.tenantId, eventId: input.tournamentId },
    }),
    prisma.tournamentFixtureAssignment.count({
      where: {
        tenantId: input.tenantId,
        fixture: { eventId: input.tournamentId },
      },
    }),
  ]);

  if (assignmentCount > 0) {
    throw new TournamentPlannerSetupNotAllowedError("ALREADY_SCHEDULED");
  }

  const draftPayload: TournamentComposerDraftPayload = {
    ...input.payload,
    homeAway: "HOME",
    spielplanCreationEnabled: true,
    planner: input.planner,
  };

  const validationErrors = validateHomePlannerDraft(draftPayload);
  if (Object.keys(validationErrors).length > 0) {
    throw new Error("Turnierplanung unvollständig.");
  }

  const [existingPitches, existingBreaks] = await Promise.all([
    listTournamentPitches(input.tenantId, input.tournamentId),
    listTournamentBreaks(input.tenantId, input.tournamentId),
  ]);
  const pitchIdByLocal = new Map<string, string>();
  const plannerForPersist =
    existingBreaks.length > 0 ? { ...input.planner, breaks: [] } : input.planner;

  if (existingPitches.length === 0) {
    await persistTournamentPlannerFromComposer({
      tenantId: input.tenantId,
      tournamentId: input.tournamentId,
      payload: draftPayload,
      planner: plannerForPersist,
    });
    return;
  }

  if (fixtureCount > 0) {
    throw new TournamentPlannerSetupNotAllowedError("ALREADY_SCHEDULED");
  }

  for (let i = 0; i < plannerForPersist.pitches.length; i += 1) {
    const draftPitch = plannerForPersist.pitches[i]!;
    const existing = existingPitches[i];
    if (existing) {
      await updateTournamentPitch(input.tenantId, input.tournamentId, existing.id, {
        label: draftPitch.label,
        displayOrder: i,
        playersPerSide: draftPitch.playersPerSide ?? null,
      });
      pitchIdByLocal.set(draftPitch.localId, existing.id);
    } else {
      const created = await createTournamentPitch(input.tenantId, input.tournamentId, {
        label: draftPitch.label,
        displayOrder: i,
        playersPerSide: draftPitch.playersPerSide ?? null,
      });
      pitchIdByLocal.set(draftPitch.localId, created.id);
    }
  }

  await persistTournamentPlannerFromComposer({
    tenantId: input.tenantId,
    tournamentId: input.tournamentId,
    payload: draftPayload,
    planner: plannerForPersist,
    existingPitchIdByLocalId: pitchIdByLocal,
  });
}
