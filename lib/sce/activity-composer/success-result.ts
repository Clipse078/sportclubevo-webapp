import type { SceActivityCreateKind } from "./types";

/** Domain submit adapter result surfaced to host on successful create. */
export type SceActivityCreateSuccessResult<TPayload = unknown> = {
  activityKind: SceActivityCreateKind;
  activityId: string;
  /** Canonical navigation target when available. */
  routeHref?: string;
  /** Optional presentation metadata for highlight/refresh (01G). */
  presentation?: {
    title?: string;
    highlightToken?: string;
  };
  domainPayload?: TPayload;
};
