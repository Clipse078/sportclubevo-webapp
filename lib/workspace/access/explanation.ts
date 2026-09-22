/**
 * WORKSPACE-01 — access explanation / provenance structures (WORKSPACE-03 UX consumes these).
 */

import type {
  AccessPathSegment,
  EffectiveAccessPath,
} from "@/lib/workspace/access/types";

export type AccessExplanation = {
  effectiveLevel: EffectiveAccessPath["effectiveLevel"];
  mode: "inherited" | "explicit" | "intersected";
  requiredAudiences: EffectiveAccessPath["requiredAudiences"];
  inheritedFromResourceId: string | null;
  inheritedFromResourceType: AccessPathSegment["resourceType"] | null;
  segments: AccessPathSegment[];
};

export function explainEffectiveAccessPath(
  path: EffectiveAccessPath,
): AccessExplanation {
  const explicitSegment = path.segments.find((s) => s.source === "explicit_grant");
  const inheritedSegment = path.segments.find((s) => s.source === "inherited");

  let mode: AccessExplanation["mode"] = "inherited";
  if (explicitSegment && path.requiredAudiences.length > 1) {
    mode = "intersected";
  } else if (explicitSegment) {
    mode = "explicit";
  }

  return {
    effectiveLevel: path.effectiveLevel,
    mode,
    requiredAudiences: path.requiredAudiences,
    inheritedFromResourceId:
      inheritedSegment?.resourceId ?? explicitSegment?.resourceId ?? null,
    inheritedFromResourceType:
      inheritedSegment?.resourceType ?? explicitSegment?.resourceType ?? null,
    segments: path.segments,
  };
}

export function identifyInheritedSource(
  explanation: AccessExplanation,
): { resourceId: string | null; resourceType: AccessExplanation["inheritedFromResourceType"] } {
  return {
    resourceId: explanation.inheritedFromResourceId,
    resourceType: explanation.inheritedFromResourceType,
  };
}
