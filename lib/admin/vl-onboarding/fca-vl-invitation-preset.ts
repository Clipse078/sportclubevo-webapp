/**
 * FC Allschwil — established Vereinsleitung invitation access preset (least privilege).
 */

import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_ROLE_CAPABILITY_FLAGS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";

export const FCA_VL_INVITATION_PRESET = {
  tenantKey: PILOT_TENANT_KEY,
  roleMatch: {
    name: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name,
    key: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey,
  },
  orgUnitKey: "vereinsleitung" as const,
  /** Optional until PO confirms organisational function per person. */
  functionKey: null as string | null,
  permissionKeys: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys,
  roleCapabilityFlags: FCA_VL_ROLE_CAPABILITY_FLAGS,
  presetLabel: "Vereinsleitung (Pilot) — Mitwirkung",
} as const;

export type VlInvitationPresetSnapshot = typeof FCA_VL_INVITATION_PRESET;