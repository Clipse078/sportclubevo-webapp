/**
 * SCE-COMM-01 — Zielgruppe / audience definition contracts.
 *
 * Zielgruppen are an organisation-wide Communication capability (see docs).
 * Saved audiences persist as TargetGroup rows; communications may also inline
 * structural selectors or explicit persons for one-off sends.
 */

import type { TargetGroupClause } from "@/lib/org/target-group-types";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";

export const AUDIENCE_COMPOSITION_MODES = ["UNION", "INTERSECTION"] as const;

export type AudienceCompositionMode = (typeof AUDIENCE_COMPOSITION_MODES)[number];

/** Explicit include/exclude person lists (tenant-scoped person ids). */
export type ExplicitPersonAudience = {
  includePersonIds?: string[];
  excludePersonIds?: string[];
};

/**
 * One audience component. Multiple components compose via CommunicationAudienceSpec.
 */
export type ZielgruppeAudienceComponent = {
  label?: string;
  structural?: StructuralAudienceSelectors;
  /** Saved TargetGroup.id references (tenant-scoped Zielgruppe definitions). */
  savedTargetGroupIds?: string[];
  /** Inline dynamic rule (same schema as TargetGroup.ruleJson). */
  dynamicRule?: TargetGroupClause | null;
  explicit?: ExplicitPersonAudience;
};

export type CommunicationAudienceSpec = {
  composition: AudienceCompositionMode;
  components: ZielgruppeAudienceComponent[];
};

/** Event-context presets consume participation state — not duplicated here. */
export const EVENT_AUDIENCE_PRESETS = [
  "ALL_INVITEES",
  "ACCEPTED_ONLY",
  "DECLINED_ONLY",
  "NOT_RESPONDED",
] as const;

export type EventAudiencePreset = (typeof EVENT_AUDIENCE_PRESETS)[number];

export function isEventAudiencePreset(value: string): value is EventAudiencePreset {
  return (EVENT_AUDIENCE_PRESETS as readonly string[]).includes(value);
}
