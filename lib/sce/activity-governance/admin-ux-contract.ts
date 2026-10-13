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

/** 01C-R1 ships Person-centric create/publication controls and club validator pool multi-select. */
export const SCE_ACTIVITY_GOVERNANCE_ADMIN_UI_STATUS =
  "IMPLEMENTED_PENDING_PO_UAT — Person detail Club Event section + Freigabeberechtigte multi-select; raw permission keys remain secondary.";
