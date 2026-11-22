/**
 * PR #1025 — FC Allschwil Dokumentation PO UAT pilot roles (STAGE only, explicit sync).
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { PILOT_TENANT_KEY } from "@/lib/roles/pilot-fc-allschwil-role-definitions";

export { PILOT_TENANT_KEY };

export const TENANT_DOCUMENTATION_UAT_PERMISSION_KEYS = [
  PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
  PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
] as const;

export type FcaDokumentationUatPilotRoleDefinition = {
  roleKey: string;
  name: string;
  description: string;
  permissionKeys: readonly PermissionKey[];
  assigneeEmails: readonly string[];
};

export const FCA_DOKUMENTATION_UAT_EDITOR_ROLE: FcaDokumentationUatPilotRoleDefinition = {
  roleKey: "pilot_dokumentation_editor",
  name: "Dokumentation Editor (Pilot)",
  description:
    "PR #1025 STAGE UAT — co-edit Dokumentation pages without publish or manage.",
  permissionKeys: [
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  ],
  assigneeEmails: ["irem.uysal@fcallschwil.ch", "nicole.nussli@fcallschwil.ch"],
};

export const FCA_DOKUMENTATION_UAT_PUBLISHER_ROLE: FcaDokumentationUatPilotRoleDefinition = {
  roleKey: "pilot_dokumentation_publisher",
  name: "Dokumentation Publisher (Pilot)",
  description: "PR #1025 STAGE UAT — edit and publish Dokumentation pages.",
  permissionKeys: [
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  ],
  assigneeEmails: ["patrick.scotton@fcallschwil.ch"],
};

export const FCA_DOKUMENTATION_UAT_READER_ROLE: FcaDokumentationUatPilotRoleDefinition = {
  roleKey: "pilot_dokumentation_reader",
  name: "Dokumentation Reader (Pilot)",
  description:
    "PR #1025 STAGE UAT — read published Dokumentation only (mention recipient).",
  permissionKeys: [PERMISSIONS.TENANT_DOCUMENTATION_VIEW],
  assigneeEmails: ["andreas.gaedt@fcallschwil.ch"],
};

export const FCA_DOKUMENTATION_UAT_PILOT_ROLES = [
  FCA_DOKUMENTATION_UAT_EDITOR_ROLE,
  FCA_DOKUMENTATION_UAT_PUBLISHER_ROLE,
  FCA_DOKUMENTATION_UAT_READER_ROLE,
] as const;