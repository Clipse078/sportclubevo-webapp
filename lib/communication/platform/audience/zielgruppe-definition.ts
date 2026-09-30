/**
 * SCE-COMM-01 — Zielgruppe / audience definition contracts.
 *
 * Zielgruppen are an organisation-wide Communication capability (see docs).
 * Saved audiences persist as TargetGroup rows; communications may also inline
 * structural selectors or explicit persons for one-off sends.
 */

import type { TargetGroupClause } from "@/lib/org/target-group-types";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
import type { SponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-selectors";

export const AUDIENCE_COMPOSITION_MODES = ["UNION", "INTERSECTION"] as const;

export type AudienceCompositionMode = (typeof AUDIENCE_COMPOSITION_MODES)[number];

/** Explicit include/exclude person lists (tenant-scoped person ids). */
export type ExplicitPersonAudience = {
  includePersonIds?: string[];
  excludePersonIds?: string[];
};

/** Explicit include/exclude external communication contacts (tenant-scoped ids). */
export type ExplicitExternalContactAudience = {
  includeExternalContactIds?: string[];
  excludeExternalContactIds?: string[];
};

/**
 * Stable persisted reference to a domain-owned audience (SCE-DOMAIN-AUDIENCE-01).
 * Identity is `{ sourceKey, candidateId }` — labels are display-only and not authoritative.
 */
export type DomainAudienceReference = {
  /** Registry composite key `{domainKey}.{sourceKey}`. */
  sourceKey: string;
  /** Domain-scoped candidate id from {@link DomainAudienceSource.searchCandidates}. */
  candidateId: string;
  /** Optional frozen German label when source metadata is unavailable in UI. */
  displayLabel?: string;
};

export function domainAudienceReferenceIsEmpty(
  ref: DomainAudienceReference | undefined | null,
): boolean {
  if (!ref) return true;
  return !ref.sourceKey?.trim() || !ref.candidateId?.trim();
}

/**
 * One audience component. Multiple components compose via CommunicationAudienceSpec.
 */
export type ZielgruppeAudienceComponent = {
  label?: string;
  /** Domain module audience — materialized via DOMAIN-AUDIENCE-01 registry before COMM-03. */
  domainAudience?: DomainAudienceReference;
  structural?: StructuralAudienceSelectors;
  /** Saved TargetGroup.id references (tenant-scoped Zielgruppe definitions). */
  savedTargetGroupIds?: string[];
  /** Inline dynamic rule (same schema as TargetGroup.ruleJson). */
  dynamicRule?: TargetGroupClause | null;
  explicit?: ExplicitPersonAudience;
  external?: ExplicitExternalContactAudience;
  /** Sponsor-domain audience selectors (COMM-13); resolved via Sponsor module, not copied. */
  sponsor?: SponsorAudienceSelectors;
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
