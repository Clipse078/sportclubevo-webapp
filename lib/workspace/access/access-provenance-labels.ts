/**
 * WORKSPACE-09-04 — human-readable provenance ("Warum?") for effective access rows.
 */

import type { AccessExplanation } from "@/lib/workspace/access/explanation";
import type { AudienceRef } from "@/lib/workspace/access/types";

export function buildWhyAccessLabel(input: {
  audience: AudienceRef;
  audienceLabel: string;
  explanationMode: AccessExplanation["mode"];
  segmentSource: "explicit_grant" | "inherited";
  inheritedFromResourceName: string | null;
}): string {
  if (input.segmentSource === "inherited") {
    if (input.inheritedFromResourceName) {
      return `Geerbt von ${input.inheritedFromResourceName}`;
    }
    return "Geerbt vom übergeordneten Ordner";
  }

  switch (input.audience.kind) {
    case "ORGANISATION":
      return "Alle Mitglieder mit Workspace-Zugang";
    case "ORG_UNIT":
      return `Über Organisationseinheit · ${input.audienceLabel}`;
    case "TEAM":
      return `Über Team · ${input.audienceLabel}`;
    case "ROLE":
      return `Über Rolle · ${input.audienceLabel}`;
    case "PERSON":
      return "Direkter Zugriff";
    default:
      return input.audienceLabel;
  }
}

export function buildAccessInheritanceCopy(input: {
  policyMode: "INHERIT" | "EXPLICIT";
  resourceType: "FOLDER" | "DOCUMENT";
  parentName: string | null;
}): { headline: string; description: string } {
  const resourceWord =
    input.resourceType === "DOCUMENT" ? "Diese Datei" : "Dieser Ordner";

  if (input.policyMode === "INHERIT") {
    if (input.parentName) {
      return {
        headline: `Geerbt von: ${input.parentName}`,
        description: `Zugriff wird vom Ordner «${input.parentName}» übernommen.`,
      };
    }
    return {
      headline: "Geerbt vom übergeordneten Ordner",
      description: "Zugriff wird vom übergeordneten Ordner übernommen.",
    };
  }

  return {
    headline: "Eigene Zugriffseinstellungen",
    description: `${resourceWord} hat eigene Zugriffseinstellungen.`,
  };
}
