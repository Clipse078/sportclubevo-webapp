import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "./tournament-composer-planner-defaults";
import { sanitizeOrganiserDraftFields } from "./tournament-composer-organiser";
import {
  normalizeComposerBreakDraft,
  type LegacyComposerBreakDraft,
} from "./tournament-composer-planner-breaks";
import { buildTeamAgeGroupLookup, resolveComposerProgrammeCategoryContext } from "./resolve-composer-programme-category-context";
import { reconcileComposerPlannerForParticipants } from "./tournament-composer-programme-template";
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
    participants: Array.isArray(payload.participants) ? payload.participants : [],
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
            const { categoryContext } = resolveComposerProgrammeCategoryContext({
              participants,
              teamAgeGroupById,
            });
            return reconcileComposerPlannerForParticipants({
              planner: normalized,
              participantCount: participants.length,
              categoryContext,
              preserveUserPitchEdits: normalized.pitchesUserCustomized === true,
            });
          })()
        : null,
  };
}
