import type { SceActivityCreateKind } from "./types";

/**
 * Canonical commit outcomes (01B-R3). `CREATED` remains as a backwards-compatible alias for `PUBLISHED`.
 */
export type SceActivityCreateSuccessOutcome =
  | "DRAFT_SAVED"
  | "PUBLISHED"
  | "SUBMITTED_FOR_APPROVAL"
  | "CREATED";

export function normalizeActivityCreateSuccessOutcome(
  outcome: SceActivityCreateSuccessOutcome,
): "DRAFT_SAVED" | "PUBLISHED" | "SUBMITTED_FOR_APPROVAL" {
  if (outcome === "CREATED") {
    return "PUBLISHED";
  }
  return outcome;
}

/** Domain submit adapter result surfaced to host on successful create or draft save. */
export type SceActivityCreateSuccessResult<TPayload = unknown> = {
  outcome: SceActivityCreateSuccessOutcome;
  activityKind: SceActivityCreateKind;
  activityId: string;
  /** Set when `outcome` is `DRAFT_SAVED`. */
  draftId?: string;
  /** Canonical navigation target when available. */
  routeHref?: string;
  /** Optional presentation metadata for highlight/refresh (01G). */
  presentation?: {
    title?: string;
    highlightToken?: string;
  };
  domainPayload?: TPayload;
};
