/**
 * Authoritative, confirmed FC Allschwil Vereinsleitung identities for STAGE reconciliation.
 *
 * Do not infer emails from display names. Extend only after explicit PO confirmation.
 */

import { PERSON_FUNCTIONS } from "@/lib/people/functions";
import { PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";

export type FcaVlReconciliationTarget = {
  /** Verified login email (normalized lowercase). */
  readonly email: string;
  /** Stable Person id on STAGE (optional resolver hint). */
  readonly personId?: string;
  /** Tenant role name or key to assign tenant-wide when missing. */
  readonly tenantRoleMatch: { readonly name?: string; readonly key?: string };
  /** Vereinsleitung OrgUnit key for PersonAssignment. */
  readonly orgUnitKey: "vereinsleitung" | "vorstand" | "club-leadership";
  /** PersonAssignment functionKey (organisational label only). */
  readonly functionKey: string;
};

/** Confirmed VL roster slice — STAGE fc-allschwil (2026-11-17). */
export const FCA_VL_CONFIRMED_ROSTER: readonly FcaVlReconciliationTarget[] = [
  {
    email: "patrick.scotton@fcallschwil.ch",
    personId: "cmuo3i77h000g04ibl09t7t2p",
    tenantRoleMatch: {
      name: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.name,
      key: PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.roleKey,
    },
    orgUnitKey: "vereinsleitung",
    functionKey: PERSON_FUNCTIONS.PRESIDENT,
  },
] as const;