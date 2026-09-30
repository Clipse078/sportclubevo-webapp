/**
 * SCE-DOMAIN-CONSUMERS-01 — domain operational attention contract (types + identity helpers).
 */

export {
  buildDomainOperationalAttentionId,
  parseDomainOperationalAttentionId,
  type DomainOperationalAttentionIdentityParts,
  type ParsedDomainOperationalAttentionId,
} from "./source-identity";

export type {
  DeferredDomainAudienceReference,
  DomainAudienceReferenceSnapshot,
  DomainOperationalAttentionAction,
  DomainOperationalAttentionActionExecutionKind,
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
  DomainOperationalAttentionSeverity,
  DomainOperationalAttentionSource,
} from "./types";
