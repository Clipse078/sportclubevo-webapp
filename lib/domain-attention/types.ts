/**
 * SCE-DOMAIN-CONSUMERS-01 — read-model contract for domain operational attention (no persistence).
 *
 * Recipient/member obligations remain {@link PersonalAction} in lib/personal-actions.
 * Operator-facing aggregates (trainer/coordinator) use this contract.
 */

import type { PermissionKey } from "@/lib/permissions/permissions";

/** Mirrors persisted DomainAudienceReference without importing communication types. */
export type DomainAudienceReferenceSnapshot = {
  sourceKey: string;
  candidateId: string;
  displayLabel?: string | null;
};

export type DomainOperationalAttentionActionExecutionKind =
  | "COMMUNICATION_SEND"
  | "NAVIGATE"
  | "DOMAIN_MUTATION";

/**
 * Action metadata only — execution re-authorizes and re-resolves live domain state.
 * Display counts on the parent item are never send authority.
 */
export type DomainOperationalAttentionAction = {
  actionKey: string;
  label: string;
  executionKind: DomainOperationalAttentionActionExecutionKind;
  requiredPermissions: PermissionKey[];
  /** When COMMUNICATION_SEND, audience is materialized at execute time from domain state. */
  domainAudience?: DomainAudienceReferenceSnapshot;
  /** Deep link or in-app route for NAVIGATE / context. */
  href?: string | null;
};

export type DomainOperationalAttentionSeverity = "info" | "warning" | "urgent";

export type DomainOperationalAttentionItem = {
  /** Stable id — use buildDomainOperationalAttentionId(). */
  id: string;
  tenantId: string;
  domainKey: string;
  attentionKind: string;
  contextEntityType: string;
  contextEntityId: string;
  title: string;
  summary: string | null;
  severity: DomainOperationalAttentionSeverity;
  /** Derived for display; must be recomputed on action execution. */
  count: number | null;
  dueAt: string | null;
  deepLink: string;
  actions: DomainOperationalAttentionAction[];
  optionalDomainAudience?: DomainAudienceReferenceSnapshot;
};

export type DomainOperationalAttentionEvaluationContext = {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
  now: Date;
};

export interface DomainOperationalAttentionSource {
  readonly domainKey: string;
  readonly requiredPermissions: PermissionKey[];
  canDiscover(ctx: DomainOperationalAttentionEvaluationContext): boolean | Promise<boolean>;
  /** Live read — no cached recipient snapshots. */
  evaluateAttention(
    ctx: DomainOperationalAttentionEvaluationContext,
  ): Promise<DomainOperationalAttentionItem[]>;
}
