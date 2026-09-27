/**
 * SCE-COMM-03 — canonical Communication recipient resolution entry point.
 *
 * Effective recipients = selected target ∩ sender communication scope ∩ recipient eligibility.
 *
 * Application code MUST use this module (or thin authorized wrappers) — not raw
 * target-group-resolver or requirement audience helpers for communication sends.
 */

import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { intersectAudienceWithSenderScope } from "@/lib/communication/platform/authorization/communication-authorization";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import { isCommunicationChannel } from "@/lib/communication/platform/channels";
import { isCommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { computeAudienceFingerprint } from "@/lib/communication/platform/recipient-resolution/audience-fingerprint";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import {
  isPersonEligibleForChannel,
  loadPersonChannelProfiles,
} from "@/lib/communication/platform/recipient-resolution/channel-eligibility";
import { loadGuardianExpansionsForSubjects } from "@/lib/communication/platform/recipient-resolution/guardian-expansion";
import { evaluateCommunicationPreferenceForDeliveryUser } from "@/lib/communication/platform/recipient-resolution/preference-seam";
import { loadExplicitUserPreferenceMap } from "@/lib/communication/preferences/communication-preference-service";
import { loadSubjectPersonNotificationContexts } from "@/lib/notifications/requirement-recipient-resolution";
import type { RecipientExclusionReasonCode } from "@/lib/communication/platform/recipient-resolution/reason-codes";
import { resolveSenderCommunicationScope } from "@/lib/communication/platform/recipient-resolution/sender-communication-scope";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";
import type {
  EffectiveRecipientResolutionResult,
  RecipientResolutionInput,
} from "@/lib/communication/platform/recipient-resolution/types";
import { evaluateSafeguardingCommunication } from "@/lib/communication/platform/safeguarding/guardian-policy-seam";
import { DEFAULT_TENANT_SAFEGUARDING_POLICY } from "@/lib/communication/platform/recipient-resolution/guardian-expansion";
import { prisma } from "@/lib/db/prisma";
import { runRecipientResolutionPipeline } from "@/lib/communication/platform/recipient-resolution/pipeline";
import { createAudienceCandidateResolutionPort } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { createGuardianExpansionPort } from "@/lib/communication/platform/recipient-resolution/guardian-expansion";

export class RecipientResolutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientResolutionValidationError";
  }
}

function assertValidInput(input: RecipientResolutionInput): void {
  if (!input.tenantId?.trim()) {
    throw new RecipientResolutionValidationError("tenantId is required");
  }
  if (!input.senderActor?.userId?.trim()) {
    throw new RecipientResolutionValidationError("senderActor.userId is required");
  }
  const audienceErr = validateCommunicationAudienceSpec(input.audience);
  if (audienceErr) throw new RecipientResolutionValidationError(audienceErr);
  const ctxErr = validateCommunicationContextRef(input.tenantId, input.context);
  if (ctxErr) throw new RecipientResolutionValidationError(ctxErr);
  if (!isCommunicationChannel(input.channel)) {
    throw new RecipientResolutionValidationError("invalid channel");
  }
  if (!isCommunicationPreferenceCategory(input.category)) {
    throw new RecipientResolutionValidationError("invalid preference category");
  }
}

function mergeExclusion(
  map: Map<string, Set<RecipientExclusionReasonCode>>,
  personId: string,
  code: RecipientExclusionReasonCode,
) {
  const existing = map.get(personId) ?? new Set<RecipientExclusionReasonCode>();
  existing.add(code);
  map.set(personId, existing);
}

function subjectIsMinor(dateOfBirth: Date | null, now: Date): boolean {
  if (!dateOfBirth) return false;
  const ageYears = (now.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 18;
}

/**
 * Authoritative recipient resolution for preview and dispatch modes.
 */
export async function resolveCommunicationRecipients(
  input: RecipientResolutionInput,
  options?: {
    structuralExclusionSelectors?: import("@/lib/communication/platform/audience/structural-targets").StructuralAudienceSelectors;
  },
): Promise<EffectiveRecipientResolutionResult> {
  assertValidInput(input);
  const resolvedAt = new Date().toISOString();
  const fingerprint = computeAudienceFingerprint(input.audience);
  const exclusionMap = new Map<string, Set<RecipientExclusionReasonCode>>();

  const audienceResult = await resolveAudienceCandidates({
    tenantId: input.tenantId,
    audience: input.audience,
    structuralExclusionSelectors: options?.structuralExclusionSelectors,
  });
  for (const row of audienceResult.excludedRecipients) {
    for (const code of row.reasonCodes) mergeExclusion(exclusionMap, row.personId, code);
  }

  const candidatePersonIds = audienceResult.candidatePersonIds;
  const senderScopeResult = await resolveSenderCommunicationScope({
    tenantId: input.tenantId,
    senderUserId: input.senderActor.userId,
    context: input.context,
  });

  const scopedIds = intersectAudienceWithSenderScope(
    candidatePersonIds,
    senderScopeResult.scope,
  );
  const scopedSet = new Set(scopedIds);
  for (const personId of candidatePersonIds) {
    if (!scopedSet.has(personId)) {
      mergeExclusion(exclusionMap, personId, "OUTSIDE_SENDER_SCOPE");
    }
  }

  const profiles = await loadPersonChannelProfiles(input.tenantId, scopedIds);
  const notificationContexts = await loadSubjectPersonNotificationContexts(
    input.tenantId,
    scopedIds,
  );
  const deliveryUserIdsForPrefs = new Set<string>();
  for (const personId of scopedIds) {
    const ctx = notificationContexts.get(personId);
    if (ctx?.selfUserId) deliveryUserIdsForPrefs.add(ctx.selfUserId);
    for (const guardianUserId of ctx?.guardianUserIds ?? []) {
      deliveryUserIdsForPrefs.add(guardianUserId);
    }
  }
  const explicitPreferenceMap = await loadExplicitUserPreferenceMap({
    tenantId: input.tenantId,
    userIds: [...deliveryUserIdsForPrefs],
    categories: [input.category],
    channels: [input.channel],
  });

  const policy = DEFAULT_TENANT_SAFEGUARDING_POLICY(input.tenantId);
  const personRows = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: scopedIds } },
    select: { id: true, dateOfBirth: true },
  });
  const dobById = new Map(personRows.map((r) => [r.id, r.dateOfBirth]));
  const now = new Date();

  const effectiveRecipientPersonIds: string[] = [];
  for (const personId of scopedIds) {
    const profile = profiles.get(personId);
    if (!profile?.isActive) {
      mergeExclusion(exclusionMap, personId, "INACTIVE");
      continue;
    }

    const safeguarding = evaluateSafeguardingCommunication({
      policy,
      senderUserId: input.senderActor.userId,
      subjectPersonId: personId,
      subjectIsMinor: subjectIsMinor(dobById.get(personId) ?? null, now),
      channel: input.channel as CommunicationChannel,
    });
    if (!safeguarding.allowed) {
      mergeExclusion(exclusionMap, personId, "SAFEGUARDING_POLICY");
      continue;
    }

    const ctx = notificationContexts.get(personId);
    const preferenceDeliveryUserId =
      ctx?.selfUserId ??
      ctx?.guardianUserIds?.[0] ??
      profile?.userId ??
      null;
    if (preferenceDeliveryUserId) {
      const preference = await evaluateCommunicationPreferenceForDeliveryUser({
        tenantId: input.tenantId,
        deliveryUserId: preferenceDeliveryUserId,
        category: input.category,
        channel: input.channel,
        explicitMap: explicitPreferenceMap,
      });
      if (!preference.allowed) {
        mergeExclusion(exclusionMap, personId, "PREFERENCE_BLOCKED");
        continue;
      }
    }

    if (
      !isPersonEligibleForChannel({
        profile,
        channel: input.channel,
        category: input.category,
      })
    ) {
      mergeExclusion(exclusionMap, personId, "CHANNEL_UNAVAILABLE");
      continue;
    }

    effectiveRecipientPersonIds.push(personId);
  }

  const sortedEffective = sortPersonIds(effectiveRecipientPersonIds);
  const guardianExpansions = await loadGuardianExpansionsForSubjects({
    tenantId: input.tenantId,
    subjectPersonIds: sortedEffective,
  });

  const excludedRecipientsFixed = [...exclusionMap.entries()]
    .filter(([personId]) => !sortedEffective.includes(personId))
    .map(([personId, codes]) => ({
      personId,
      reasonCodes: [...codes].sort() as RecipientExclusionReasonCode[],
    }))
    .sort((a, b) => a.personId.localeCompare(b.personId));

  return {
    candidatePersonIds,
    effectiveRecipientPersonIds: sortedEffective,
    excludedRecipients: excludedRecipientsFixed,
    guardianExpansions,
    summary: {
      candidateCount: candidatePersonIds.length,
      excludedCount: excludedRecipientsFixed.length,
      effectiveCount: sortedEffective.length,
    },
    metadata: {
      tenantId: input.tenantId,
      resolvedAt,
      audienceFingerprint: fingerprint,
      context: input.context,
      channel: input.channel,
      mode: input.mode,
      preferenceEvaluation: "EVALUATED",
      senderScopeLimitedPreview: senderScopeResult.previewScopeLimited,
    },
    inclusionReasonsByPersonId: Object.fromEntries(
      sortedEffective.map((id) => [id, [] as RecipientExclusionReasonCode[]]),
    ),
  };
}

/** Dispatch pipeline wrapper producing delivery snapshot rows via COMM-01 orchestration. */
export async function resolveCommunicationRecipientsForDispatch(
  input: RecipientResolutionInput,
  communicationDispatchRef: string,
  options?: {
    structuralExclusionSelectors?: import("@/lib/communication/platform/audience/structural-targets").StructuralAudienceSelectors;
  },
) {
  const core = await resolveCommunicationRecipients(
    { ...input, mode: "DISPATCH" },
    options,
  );
  const pipeline = await runRecipientResolutionPipeline(
    {
      tenantId: input.tenantId,
      audience: input.audience,
      senderScope: (
        await resolveSenderCommunicationScope({
          tenantId: input.tenantId,
          senderUserId: input.senderActor.userId,
          context: input.context,
        })
      ).scope,
      category: input.category,
      channel: input.channel,
      eligibilityForSubject: (personId) => {
        if (!core.effectiveRecipientPersonIds.includes(personId)) return null;
        return {
          subjectPersonId: personId,
          category: input.category,
          channel: input.channel,
          channelAllowedByPreference: true,
          safeguardingAllowsChannel: true,
        };
      },
    },
    {
      audience: createAudienceCandidateResolutionPort(),
      guardians: createGuardianExpansionPort(DEFAULT_TENANT_SAFEGUARDING_POLICY(input.tenantId)),
    },
  );

  return { core, pipeline, communicationDispatchRef };
}
