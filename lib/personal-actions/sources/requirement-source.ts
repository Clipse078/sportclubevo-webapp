import { personalRequirementExecutionHref } from "@/lib/requirements/personal-navigation";
import { buildRequirementPersonalActionId } from "../identity";
import type { PersonalAction } from "../types";
import type { PersonalActionSourceAdapter, PersonalActionSourceContext } from "./types";
import { loadRequirementObligationCandidates } from "./requirement-obligations";

function mapCandidateToPersonalAction(
  candidate: Awaited<ReturnType<typeof loadRequirementObligationCandidates>>[number],
): PersonalAction {
  return {
    id: buildRequirementPersonalActionId(candidate.recipientId),
    sourceType: "REQUIREMENT",
    sourceId: candidate.recipientId,
    subject: candidate.actingForOtherPerson
      ? {
          personId: candidate.subjectPersonId,
          displayName: candidate.subjectDisplayName,
        }
      : undefined,
    title: candidate.title,
    subtitle: null,
    dueAt: candidate.dueAt?.toISOString() ?? null,
    status: "ACTIONABLE",
    href: personalRequirementExecutionHref(candidate.recipientId),
    actionKind: "REQUIREMENT_ACK",
    inlineActions: {
      requirement: {
        requirementRecipientId: candidate.recipientId,
        requirementId: candidate.requirementId,
        description: candidate.description,
        subjectPersonId: candidate.subjectPersonId,
        subjectDisplayName: candidate.subjectDisplayName,
        actingForOtherPerson: candidate.actingForOtherPerson,
      },
    },
  };
}

export const requirementPersonalActionSource: PersonalActionSourceAdapter = {
  sourceType: "REQUIREMENT",

  async loadActionable(ctx: PersonalActionSourceContext): Promise<PersonalAction[]> {
    const candidates = await loadRequirementObligationCandidates(ctx.tenantId, ctx.userId);
    return candidates.map(mapCandidateToPersonalAction);
  },

  async countActionable(ctx: PersonalActionSourceContext): Promise<number> {
    const actions = await this.loadActionable(ctx);
    return actions.length;
  },
};
