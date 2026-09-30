/**
 * SCE-COMM-03 — Stage A: audience → candidate Person ids.
 */

import { prisma } from "@/lib/db/prisma";
import type {
  CommunicationAudienceSpec,
  ZielgruppeAudienceComponent,
} from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { TargetGroupClause } from "@/lib/org/target-group-types";
import { resolveTargetGroup } from "@/lib/org/target-group-resolver";
import { parseTargetGroupRuleJson } from "@/lib/communication/zielgruppen/rule-document";
import {
  applyExplicitPersonIncludeExclude,
  intersectPersonIdSets,
  unionPersonIdSets,
} from "@/lib/communication/platform/audience/zielgruppe-validation";
import type { AudienceCandidateResolutionPort } from "@/lib/communication/platform/recipient-resolution/pipeline";
import {
  differenceSortedSets,
  sortPersonIds,
  unionSortedSets,
} from "@/lib/communication/platform/recipient-resolution/set-algebra";
import {
  resolveExplicitPersonIds,
  resolveStructuralAudiencePersonIds,
  resolveStructuralExclusionPersonIds,
} from "@/lib/communication/platform/recipient-resolution/structural-resolution";
import { resolveSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-resolution";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import type { RecipientExclusionReasonCode } from "@/lib/communication/platform/recipient-resolution/reason-codes";
import {
  dedupeExternalContactsAgainstPersonEmails,
  resolveExternalContactIdsFromAudience,
} from "@/lib/communication/platform/recipient-resolution/external-contact-resolution";
import {
  buildDomainAudienceMaterializationContext,
  communicationAudienceSpecHasDomainReferences,
  materializeDomainAudiencesInSpec,
  type DomainAudienceMaterializationContext,
} from "@/lib/communication/platform/audience/domain-audience-expansion";
import { DomainAudienceError } from "@/lib/communication/platform/audience/domain-audience-errors";

export const MAX_SAVED_TARGET_GROUP_NESTING_DEPTH = 10;

type AudienceResolutionTrace = {
  excludedRecipients: { personId: string; reasonCodes: RecipientExclusionReasonCode[] }[];
};

type ResolutionCtx = {
  tenantId: string;
  savedTargetGroupStack: string[];
  depth: number;
  trace: AudienceResolutionTrace;
};

async function resolveClauseToPersonIds(
  clause: TargetGroupClause,
  ctx: ResolutionCtx,
): Promise<string[]> {
  if (clause.type === "union") {
    const sets = await Promise.all(clause.clauses.map((sub) => resolveClauseToPersonIds(sub, ctx)));
    return sortPersonIds(unionPersonIdSets(sets));
  }
  if (clause.type === "intersection") {
    const sets = await Promise.all(clause.clauses.map((sub) => resolveClauseToPersonIds(sub, ctx)));
    return sortPersonIds(intersectPersonIdSets(sets));
  }

  switch (clause.type) {
    case "personIds": {
      const { active, inactiveOrForeign } = await resolveExplicitPersonIds(ctx.tenantId, clause.value);
      for (const id of inactiveOrForeign) {
        ctx.trace.excludedRecipients.push({
          personId: id,
          reasonCodes: ["CROSS_TENANT"],
        });
      }
      return active;
    }
    case "orgUnitIds":
      return resolveStructuralAudiencePersonIds({
        tenantId: ctx.tenantId,
        selectors: { orgUnitIds: clause.value },
        mode: "UNION",
      });
    case "teamIds":
      return resolveStructuralAudiencePersonIds({
        tenantId: ctx.tenantId,
        selectors: { teamIds: clause.value },
        mode: "UNION",
      });
    case "roleKeys":
      return resolveStructuralAudiencePersonIds({
        tenantId: ctx.tenantId,
        selectors: { roleKeys: clause.value },
        mode: "UNION",
      });
    case "userIds": {
      const users = await prisma.user.findMany({
        where: { id: { in: clause.value }, isActive: true },
        select: { id: true },
      });
      const memberships = await prisma.tenantMembership.findMany({
        where: {
          tenantId: ctx.tenantId,
          userId: { in: users.map((u) => u.id) },
          isActive: true,
        },
        select: { userId: true },
      });
      const allowedUserIds = memberships.map((m) => m.userId);
      const personRows = await prisma.person.findMany({
        where: { tenantId: ctx.tenantId, userId: { in: allowedUserIds }, isActive: true },
        select: { id: true },
      });
      return sortPersonIds(personRows.map((p) => p.id));
    }
    default:
      return [];
  }
}

async function resolveSavedTargetGroupPersonIds(
  targetGroupId: string,
  ctx: ResolutionCtx,
): Promise<string[]> {
  if (ctx.savedTargetGroupStack.includes(targetGroupId)) {
    ctx.trace.excludedRecipients.push({
      personId: targetGroupId,
      reasonCodes: ["COMPOSITION_CYCLE"],
    });
    return [];
  }
  if (ctx.depth >= MAX_SAVED_TARGET_GROUP_NESTING_DEPTH) {
    ctx.trace.excludedRecipients.push({
      personId: targetGroupId,
      reasonCodes: ["COMPOSITION_DEPTH_EXCEEDED"],
    });
    return [];
  }

  const group = await prisma.targetGroup.findUnique({
    where: { id: targetGroupId },
    select: { id: true, tenantId: true, status: true, ruleJson: true },
  });
  if (!group || group.tenantId !== ctx.tenantId || group.status === "ARCHIVED") {
    return [];
  }

  const nextCtx: ResolutionCtx = {
    ...ctx,
    savedTargetGroupStack: [...ctx.savedTargetGroupStack, targetGroupId],
    depth: ctx.depth + 1,
  };

  const parsed = parseTargetGroupRuleJson(group.ruleJson);
  if (parsed.audience) {
    return resolveAudienceSpecPersonIds(parsed.audience, nextCtx);
  }
  if (parsed.resolverClause) {
    const resolved = await resolveTargetGroup(targetGroupId, ctx.tenantId);
    if (!resolved) return [];
    const userOnly = resolved.members.filter((m) => m.userId && !m.personId).map((m) => m.userId!);
    const fromUsers = await resolveExplicitPersonIds(
      ctx.tenantId,
      (
        await prisma.person.findMany({
          where: { tenantId: ctx.tenantId, userId: { in: userOnly }, isActive: true },
          select: { id: true },
        })
      ).map((p) => p.id),
    );
    return sortPersonIds([...resolved.personIds, ...fromUsers.active]);
  }
  return [];
}

async function resolveComponentPersonIds(
  component: ZielgruppeAudienceComponent,
  ctx: ResolutionCtx,
): Promise<string[]> {
  const partialSets: string[][] = [];

  if (component.structural && component.dynamicRule?.type === "intersection") {
    const ruleSet = await resolveClauseToPersonIds(component.dynamicRule, ctx);
    if (component.structural.wholeOrganisation) {
      const whole = await resolveStructuralAudiencePersonIds({
        tenantId: ctx.tenantId,
        selectors: { wholeOrganisation: true },
        mode: "UNION",
      });
      partialSets.push(
        sortPersonIds(
          whole.filter((id) => ruleSet.includes(id)),
        ),
      );
    } else {
      const structuralSet = await resolveStructuralAudiencePersonIds({
        tenantId: ctx.tenantId,
        selectors: component.structural,
        mode: "UNION",
      });
      partialSets.push(
        sortPersonIds(structuralSet.filter((id) => ruleSet.includes(id))),
      );
    }
  } else {
    if (component.structural) {
      partialSets.push(
        await resolveStructuralAudiencePersonIds({
          tenantId: ctx.tenantId,
          selectors: component.structural,
          mode: "UNION",
        }),
      );
    }
    if (component.dynamicRule) {
      partialSets.push(await resolveClauseToPersonIds(component.dynamicRule, ctx));
    }
  }

  for (const savedId of component.savedTargetGroupIds ?? []) {
    partialSets.push(await resolveSavedTargetGroupPersonIds(savedId, ctx));
  }

  if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
    const sponsorResolved = await resolveSponsorAudienceSelectors({
      tenantId: ctx.tenantId,
      selectors: component.sponsor,
    });
    if (sponsorResolved.linkedPersonIds.length > 0) {
      const { active, inactiveOrForeign } = await resolveExplicitPersonIds(
        ctx.tenantId,
        sponsorResolved.linkedPersonIds,
      );
      for (const id of inactiveOrForeign) {
        ctx.trace.excludedRecipients.push({
          personId: id,
          reasonCodes: ["CROSS_TENANT"],
        });
      }
      partialSets.push(active);
    }
  }

  let merged =
    partialSets.length === 0 ? [] : sortPersonIds(unionSortedSets(partialSets));

  if (component.explicit) {
    const includeIds = component.explicit.includePersonIds ?? [];
    if (includeIds.length > 0) {
      const { active, inactiveOrForeign } = await resolveExplicitPersonIds(ctx.tenantId, includeIds);
      for (const id of inactiveOrForeign) {
        ctx.trace.excludedRecipients.push({
          personId: id,
          reasonCodes: ["CROSS_TENANT"],
        });
      }
      merged = applyExplicitPersonIncludeExclude(merged, { includePersonIds: active });
    }
    const excludeIds = component.explicit.excludePersonIds ?? [];
    if (excludeIds.length > 0) {
      for (const id of excludeIds) {
        ctx.trace.excludedRecipients.push({
          personId: id,
          reasonCodes: ["EXPLICITLY_EXCLUDED"],
        });
      }
      merged = applyExplicitPersonIncludeExclude(merged, { excludePersonIds: excludeIds });
    }
  }

  return sortPersonIds(merged);
}

export async function resolveAudienceSpecPersonIds(
  audience: CommunicationAudienceSpec,
  ctx: ResolutionCtx,
): Promise<string[]> {
  const componentSets = await Promise.all(
    audience.components.map((c) => resolveComponentPersonIds(c, ctx)),
  );

  if (componentSets.length === 0) return [];
  const composed =
    audience.composition === "INTERSECTION"
      ? sortPersonIds(intersectPersonIdSets(componentSets))
      : sortPersonIds(unionPersonIdSets(componentSets));

  return composed;
}

async function resolveAudienceForResolution(input: {
  audience: CommunicationAudienceSpec;
  domainMaterialization?: DomainAudienceMaterializationContext;
}): Promise<CommunicationAudienceSpec> {
  if (!communicationAudienceSpecHasDomainReferences(input.audience)) {
    return input.audience;
  }
  if (!input.domainMaterialization) {
    throw new DomainAudienceError(
      "CANDIDATE_RESOLUTION_FAILED",
      "Domain audience materialization requires senderUserId and authorization context.",
    );
  }
  return materializeDomainAudiencesInSpec(input.audience, input.domainMaterialization);
}

export async function resolveAudienceCandidates(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
  structuralExclusionSelectors?: import("@/lib/communication/platform/audience/structural-targets").StructuralAudienceSelectors;
  senderUserId?: string;
  domainMaterialization?: DomainAudienceMaterializationContext;
}): Promise<{
  candidatePersonIds: string[];
  candidateExternalContactIds: string[];
  excludedRecipients: { personId: string; reasonCodes: RecipientExclusionReasonCode[] }[];
}> {
  const trace: AudienceResolutionTrace = { excludedRecipients: [] };
  const ctx: ResolutionCtx = {
    tenantId: input.tenantId,
    savedTargetGroupStack: [],
    depth: 0,
    trace,
  };

  let materialization = input.domainMaterialization;
  if (
    communicationAudienceSpecHasDomainReferences(input.audience) &&
    !materialization &&
    input.senderUserId
  ) {
    materialization = await buildDomainAudienceMaterializationContext({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
    });
  }

  const audience = await resolveAudienceForResolution({
    audience: input.audience,
    domainMaterialization: materialization,
  });

  let candidates = await resolveAudienceSpecPersonIds(audience, ctx);

  if (input.structuralExclusionSelectors) {
    const exclusionSet = await resolveStructuralExclusionPersonIds({
      tenantId: input.tenantId,
      selectors: input.structuralExclusionSelectors,
    });
    for (const id of exclusionSet) {
      if (candidates.includes(id)) {
        trace.excludedRecipients.push({ personId: id, reasonCodes: ["EXPLICITLY_EXCLUDED"] });
      }
    }
    candidates = differenceSortedSets(candidates, exclusionSet);
  }

  let externalContactIds = await resolveExternalContactIdsFromAudience({
    tenantId: input.tenantId,
    audience,
  });
  externalContactIds = await dedupeExternalContactsAgainstPersonEmails({
    tenantId: input.tenantId,
    personIds: candidates,
    externalContactIds,
  });

  return {
    candidatePersonIds: candidates,
    candidateExternalContactIds: externalContactIds,
    excludedRecipients: trace.excludedRecipients,
  };
}

export function createAudienceCandidateResolutionPort(): AudienceCandidateResolutionPort {
  return {
    resolveAudiencePersonIds: async (tenantId, audience) => {
      const result = await resolveAudienceCandidates({ tenantId, audience });
      return result.candidatePersonIds;
    },
  };
}
