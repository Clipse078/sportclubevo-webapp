import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "./tournament-composer-planner-defaults";
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
    planner:
      payload.homeAway === "HOME"
        ? (() => {
            const participants = Array.isArray(payload.participants) ? payload.participants : [];
            const base =
              payload.planner ?? createDefaultTournamentComposerPlannerDraft();
            const normalized = {
              ...base,
              breaks: base.breaks.map((br) =>
                normalizeComposerBreakDraft(br as LegacyComposerBreakDraft),
              ),
            };
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
