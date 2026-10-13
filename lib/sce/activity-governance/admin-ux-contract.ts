import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";
import type { SceActivityPublicationAuthority } from "./types";

/**
 * Person-centric admin view (Personen & Zugänge → Person → Aktivitäten).
 * Binary create ON/OFF → canonical Toggle. Publication mode → single-choice control.
 */
export type SceActivityPersonCentricGovernanceRow = {
  activityType: SceActivityCreateKind;
  createEnabled: boolean;
  publicationAuthority: SceActivityPublicationAuthority;
};

export type SceActivityPersonCentricGovernanceView = {
  personId: string;
  rows: readonly SceActivityPersonCentricGovernanceRow[];
};

/**
 * Governance-centric admin view (Aktivitätsfreigaben) — same underlying policy store.
 */
export type SceActivityGovernanceCentricCreatorRow = {
  personId: string;
  displayName: string;
  publicationAuthority: SceActivityPublicationAuthority;
};

export type SceActivityGovernanceCentricTypeSection = {
  activityType: SceActivityCreateKind;
  validatorPersonIds: readonly string[];
  creators: readonly SceActivityGovernanceCentricCreatorRow[];
};

export type SceActivityGovernanceCentricView = {
  tenantId: string;
  sections: readonly SceActivityGovernanceCentricTypeSection[];
};

/** Full production Admin UI deferred to post-01B package with RPERM seed + persistence. */
export const SCE_ACTIVITY_GOVERNANCE_ADMIN_UI_DEFERRED =
  "01B-R3 defines contracts and policy primitives only; Club Admin Person/Governance views ship with governance persistence and RPERM integration (follow 01C gate).";
