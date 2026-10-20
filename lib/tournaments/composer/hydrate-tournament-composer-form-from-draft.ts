import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { sanitizeOrganiserDraftFields } from "./tournament-composer-organiser";
import {
  normalizeComposerBreakDraft,
  type LegacyComposerBreakDraft,
} from "./tournament-composer-planner-breaks";
import {
  buildTeamAgeGroupLookup,
  buildTeamJuniorCategoryLookup,
} from "./resolve-composer-programme-category-context";
import { prepareTournamentComposerProposal } from "./prepare-tournament-composer-proposal";
import { resolveComposerSpielplanCreationEnabled } from "./resolve-composer-spielplan-creation-enabled";
import { mergePlannerScheduleRoundBreaks } from "./tournament-composer-schedule-round-breaks";
import type { TournamentTeamOption } from "./load-tournament-composer-create-surface-props.server";

export function hydrateTournamentComposerFormFromDraft(
  payload: TournamentComposerDraftPayload,
  options?: { teamOptions?: readonly TournamentTeamOption[] },
): TournamentComposerDraftPayload {
  const organiserFields = sanitizeOrganiserDraftFields(
    payload.homeAway ?? "HOME",
    payload.organizerExternalClubId,
    payload.organizerExternalClubName,
  );
  return {
    ...payload,
    organizerExternalClubId: organiserFields.organizerExternalClubId,
    organizerExternalClubName: organiserFields.organizerExternalClubName,
    title: payload.title ?? "Turnier",
    description: payload.description ?? "",
    location: payload.location ?? "",
    participants: (() => {
      const rows = Array.isArray(payload.participants) ? payload.participants : [];
      const teamAgeGroupById = buildTeamAgeGroupLookup(options?.teamOptions ?? []);
      const teamJuniorCategoryById = buildTeamJuniorCategoryLookup(options?.teamOptions ?? []);
      return rows.map((row) => {
        if (row.kind !== "TEAM" || !row.teamId) return row;
        const teamAgeGroup =
          row.teamAgeGroup !== undefined ? row.teamAgeGroup : (teamAgeGroupById.get(row.teamId) ?? null);
        const teamJuniorCategoryCode =
          row.teamJuniorCategoryCode !== undefined
            ? row.teamJuniorCategoryCode
            : (teamJuniorCategoryById.get(row.teamId) ?? null);
        if (
          row.teamAgeGroup === teamAgeGroup &&
          row.teamJuniorCategoryCode === teamJuniorCategoryCode
        ) {
          return row;
        }
        return { ...row, teamAgeGroup, teamJuniorCategoryCode };
      });
    })(),
    resourceAllocations: Array.isArray(payload.resourceAllocations) ? payload.resourceAllocations : [],
    publication: payload.publication ?? {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
    spielplanCreationEnabled: resolveComposerSpielplanCreationEnabled(payload),
    planner:
      payload.homeAway === "HOME"
        ? (() => {
            if (!payload.planner) return null;
            const participants = Array.isArray(payload.participants) ? payload.participants : [];
            const normalized = mergePlannerScheduleRoundBreaks({
              ...payload.planner,
              breaks: payload.planner.breaks.map((br) =>
                normalizeComposerBreakDraft(br as LegacyComposerBreakDraft),
              ),
            });
            if (!resolveComposerSpielplanCreationEnabled({ ...payload, planner: normalized })) {
              return normalized;
            }
            const teamAgeGroupById = buildTeamAgeGroupLookup(options?.teamOptions ?? []);
            const teamJuniorCategoryById = buildTeamJuniorCategoryLookup(options?.teamOptions ?? []);
            return prepareTournamentComposerProposal({
              participants,
              planner: normalized,
              teamAgeGroupById,
              teamJuniorCategoryById,
              preserveUserPitchEdits: normalized.pitchesUserCustomized === true,
            }).planner;
          })()
        : null,
  };
}
