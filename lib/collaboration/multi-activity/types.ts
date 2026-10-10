/**
 * SCE-COLLAB-01D — grouped impact built from atomic ActivityChangeImpact rows.
 */

import type {
  ActivityAudienceContext,
  ActivityChangeImpact,
  ActivityChangeSet,
  ActivityCollaborationDomain,
} from "@/lib/collaboration/activity-change/types";

export const MULTI_ACTIVITY_DISPATCH_STRATEGIES = ["COMBINED", "SEPARATE_REQUIRED"] as const;

export type MultiActivityDispatchStrategy = (typeof MULTI_ACTIVITY_DISPATCH_STRATEGIES)[number];

export type MultiActivityChangeImpactItem = {
  activityId: string;
  impact: ActivityChangeImpact;
};

export type MultiActivityChangeImpact = {
  worthy: boolean;
  batchOperationId: string;
  domain: ActivityCollaborationDomain;
  dispatchStrategy: MultiActivityDispatchStrategy;
  activityCount: number;
  items: MultiActivityChangeImpactItem[];
  audience: ActivityAudienceContext | null;
  canCommunicate: boolean;
  batchFingerprint: string | null;
};

export type MultiActivityChangeSet = {
  domain: ActivityCollaborationDomain;
  batchOperationId: string;
  teamId: string;
  changeSets: ActivityChangeSet[];
  batchFingerprint: string;
};
