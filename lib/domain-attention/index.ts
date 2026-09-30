/**
 * SCE-DOMAIN-CONSUMERS-01 — domain operational attention contract (types + identity helpers).
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — registry, aggregation, action dispatch.
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

export {
  registerDomainOperationalAttentionSource,
  listRegisteredDomainOperationalAttentionSources,
  getDomainOperationalAttentionSource,
  _clearDomainOperationalAttentionRegistryForTests,
} from "./operational-attention-registry";

export {
  buildOperationalAttentionSourceRegistryKey,
  type OperationalAttentionSourceRegistryKey,
} from "./operational-attention-source-id";

export { ensureProductionOperationalAttentionSourcesRegistered } from "./register-production-operational-attention-sources";

export {
  loadDomainOperationalAttention,
  type LoadDomainOperationalAttentionArgs,
  type LoadDomainOperationalAttentionResult,
} from "./load-domain-operational-attention";

export {
  compareDomainOperationalAttentionItems,
  sortDomainOperationalAttentionItems,
} from "./sort-operational-attention-items";

export {
  executeDomainOperationalAttentionAction,
  DomainOperationalAttentionActionNotFoundError,
  DomainOperationalAttentionItemNotFoundError,
} from "./execute-operational-attention-action";
