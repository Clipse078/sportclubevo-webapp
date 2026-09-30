/**
 * SCE-DOMAIN-CONSUMERS-01 — stable identity for operator/domain operational attention items.
 *
 * PersonalAction ids cover recipient obligations; this format covers aggregate
 * operator attention (e.g. outstanding participation responses on an event).
 */

const ATTENTION_ID_PREFIX = "domain-attn";
const SEGMENT = /[^a-z0-9._-]/gi;

function sanitizeSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Domain operational attention identity segment must be non-empty.");
  }
  const normalized = trimmed.replace(SEGMENT, "-").replace(/-+/g, "-");
  if (!normalized) {
    throw new Error("Domain operational attention identity segment must be non-empty.");
  }
  return normalized;
}

export type DomainOperationalAttentionIdentityParts = {
  domainKey: string;
  attentionKind: string;
  contextEntityType: string;
  contextEntityId: string;
};

export function buildDomainOperationalAttentionId(
  parts: DomainOperationalAttentionIdentityParts,
): string {
  const domainKey = sanitizeSegment(parts.domainKey);
  const attentionKind = sanitizeSegment(parts.attentionKind);
  const contextEntityType = sanitizeSegment(parts.contextEntityType);
  const contextEntityId = sanitizeSegment(parts.contextEntityId);
  return [
    ATTENTION_ID_PREFIX,
    domainKey,
    attentionKind,
    contextEntityType,
    contextEntityId,
  ].join(":");
}

export type ParsedDomainOperationalAttentionId = DomainOperationalAttentionIdentityParts;

export function parseDomainOperationalAttentionId(
  id: string,
): ParsedDomainOperationalAttentionId | null {
  const segments = id.split(":");
  if (segments.length !== 5) return null;
  if (segments[0] !== ATTENTION_ID_PREFIX) return null;
  const [, domainKey, attentionKind, contextEntityType, contextEntityId] = segments;
  if (!domainKey || !attentionKind || !contextEntityType || !contextEntityId) return null;
  return { domainKey, attentionKind, contextEntityType, contextEntityId };
}
