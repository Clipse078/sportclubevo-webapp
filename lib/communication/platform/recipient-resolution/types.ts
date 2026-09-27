/**
 * SCE-COMM-03 — recipient resolution input/output contracts.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { RecipientExclusionReasonCode } from "@/lib/communication/platform/recipient-resolution/reason-codes";

export const RECIPIENT_RESOLUTION_MODES = ["PREVIEW", "DISPATCH"] as const;

export type RecipientResolutionMode = (typeof RECIPIENT_RESOLUTION_MODES)[number];

export type RecipientResolutionSenderActor = {
  userId: string;
};

export type RecipientResolutionInput = {
  tenantId: string;
  senderActor: RecipientResolutionSenderActor;
  audience: CommunicationAudienceSpec;
  context: CommunicationContextRef;
  channel: CommunicationChannel;
  category: CommunicationPreferenceCategory;
  mode: RecipientResolutionMode;
};

export type ExcludedRecipient = {
  personId: string;
  reasonCodes: RecipientExclusionReasonCode[];
};

export type GuardianExpansionRecord = {
  sourcePersonId: string;
  guardianPersonId: string;
  policyReason: string;
};

export type RecipientResolutionSummary = {
  candidateCount: number;
  excludedCount: number;
  effectiveCount: number;
};

export type RecipientResolutionMetadata = {
  tenantId: string;
  resolvedAt: string;
  audienceFingerprint: string;
  context: CommunicationContextRef;
  channel: CommunicationChannel;
  mode: RecipientResolutionMode;
  preferenceEvaluation: "DEFERRED_DEFAULT_ALLOW" | "EVALUATED";
  senderScopeLimitedPreview: boolean;
};

export type EffectiveRecipientResolutionResult = {
  candidatePersonIds: string[];
  effectiveRecipientPersonIds: string[];
  excludedRecipients: ExcludedRecipient[];
  guardianExpansions: GuardianExpansionRecord[];
  summary: RecipientResolutionSummary;
  metadata: RecipientResolutionMetadata;
  /** Compact per-person inclusion hints for explainability (no PII). */
  inclusionReasonsByPersonId: Record<string, RecipientExclusionReasonCode[]>;
};
