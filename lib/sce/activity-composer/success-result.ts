import type { SceActivityCreateKind } from "./types";

export type SceActivityCreateSuccessOutcome = "DRAFT_SAVED" | "CREATED";

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
