import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";
import type { SceActivityCreateSuccessOutcome } from "@/lib/sce/activity-composer/success-result";
import type { SceActivityEffectiveGovernance, SceActivityPublicationAuthority } from "./types";

const SUBMIT_FOR_APPROVAL_LABEL: Record<SceActivityCreateKind, string> = {
  TRAINING: "Zur Freigabe einreichen",
  MATCH: "Zur Freigabe einreichen",
  TOURNAMENT: "Zur Freigabe einreichen",
  CLUB_EVENT: "Zur Freigabe einreichen",
};

export function resolveActivityComposerCommitActionLabel(input: {
  activityKind: SceActivityCreateKind;
  directPublishLabel: string;
  publicationAuthority: SceActivityPublicationAuthority;
}): string {
  if (input.publicationAuthority === "APPROVAL_REQUIRED") {
    return SUBMIT_FOR_APPROVAL_LABEL[input.activityKind];
  }
  return input.directPublishLabel;
}

export function resolveCommitSuccessOutcome(input: {
  publicationAuthority: SceActivityPublicationAuthority;
}): Exclude<SceActivityCreateSuccessOutcome, "CREATED"> {
  return input.publicationAuthority === "APPROVAL_REQUIRED"
    ? "SUBMITTED_FOR_APPROVAL"
    : "PUBLISHED";
}

export function resolveComposerCommitActionLabelFromGovernance(input: {
  directPublishLabel: string;
  effectiveGovernance: SceActivityEffectiveGovernance;
}): string {
  return resolveActivityComposerCommitActionLabel({
    activityKind: input.effectiveGovernance.activityType,
    directPublishLabel: input.directPublishLabel,
    publicationAuthority: input.effectiveGovernance.publicationAuthority,
  });
}

/** Draft save never enters governance approval — only explicit commit after commit validation. */
export const SCE_ACTIVITY_DRAFT_SAVE_NEVER_SUBMITS_FOR_APPROVAL =
  "Saving a draft must not trigger governance approval or PENDING_APPROVAL state.";
