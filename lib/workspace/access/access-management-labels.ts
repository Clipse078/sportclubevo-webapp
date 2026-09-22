/**
 * WORKSPACE-03 — human-readable German labels for canonical access levels / modes.
 */

import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type { AudienceRef } from "@/lib/workspace/access/types";

export function accessLevelLabelDe(level: CanonicalResourceLevel): string {
  switch (level) {
    case "VIEW":
      return "Lesen";
    case "EDIT":
      return "Bearbeiten";
    case "MANAGE":
      return "Verwalten";
    default:
      return level;
  }
}

export function accessLevelDescriptionDe(level: CanonicalResourceLevel): string {
  switch (level) {
    case "VIEW":
      return "Kann Inhalte ansehen und herunterladen.";
    case "EDIT":
      return "Kann Inhalte bearbeiten und hochladen.";
    case "MANAGE":
      return "Kann zusätzlich Berechtigungen verwalten.";
    default:
      return "";
  }
}

export function policyModeLabelDe(mode: WorkspaceAccessInheritanceMode): string {
  return mode === WorkspaceAccessInheritanceMode.INHERIT
    ? "Geerbt vom übergeordneten Ordner"
    : "Eingeschränkt auf dieser Ressource";
}

export function audienceKindLabelDe(kind: AudienceRef["kind"]): string {
  switch (kind) {
    case "ORGANISATION":
      return "Organisation";
    case "ORG_UNIT":
      return "Organisationseinheit";
    case "TEAM":
      return "Team";
    case "ROLE":
      return "Rolle/Funktion";
    case "PERSON":
      return "Person";
    default:
      return kind;
  }
}
