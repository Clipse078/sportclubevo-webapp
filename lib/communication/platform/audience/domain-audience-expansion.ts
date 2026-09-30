/**
 * SCE-DOMAIN-AUDIENCE-01 — materialize persisted domain audience references into canonical components.
 */

import type {
  CommunicationAudienceSpec,
  DomainAudienceReference,
  ZielgruppeAudienceComponent,
} from "@/lib/communication/platform/audience/zielgruppe-definition";
import { domainAudienceReferenceIsEmpty } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { DomainAudienceError } from "@/lib/communication/platform/audience/domain-audience-errors";
import { getDomainAudienceSourceRegistry } from "@/lib/communication/platform/audience/domain-audience-registry";
import type { DomainAudienceDiscoveryContext } from "@/lib/communication/platform/audience/domain-audience-source";
import { isDomainAudienceSourceAuthorized } from "@/lib/communication/platform/audience/domain-audience-discovery";
import { ensureProbetrainingDomainAudienceRegistered } from "@/lib/registrations/domain-audience/register-probetraining-domain-audience";
import { ensureSpielbetriebDomainAudienceRegistered } from "@/lib/spielbetrieb/domain-audience/register-spielbetrieb-domain-audience";

function ensureDomainAudienceSourcesRegistered(): void {
  ensureProbetrainingDomainAudienceRegistered();
  ensureSpielbetriebDomainAudienceRegistered();
}

export type DomainAudienceMaterializationContext = {
  tenantId: string;
  senderUserId: string;
  discovery: DomainAudienceDiscoveryContext;
};

async function materializeComponent(
  component: ZielgruppeAudienceComponent,
  ctx: DomainAudienceMaterializationContext,
): Promise<ZielgruppeAudienceComponent> {
  const ref = component.domainAudience;
  if (!ref || domainAudienceReferenceIsEmpty(ref)) {
    return component;
  }

  if (ref.sourceKey.trim() !== ref.sourceKey || ref.candidateId.trim() !== ref.candidateId) {
    throw new DomainAudienceError("INVALID_REFERENCE", "Domain audience reference is malformed.");
  }

  ensureDomainAudienceSourcesRegistered();
  const registry = getDomainAudienceSourceRegistry();
  const source = registry.get(ref.sourceKey);
  if (!source) {
    throw new DomainAudienceError(
      "SOURCE_NOT_REGISTERED",
      `Domain audience source "${ref.sourceKey}" is not available.`,
    );
  }

  if (!(await isDomainAudienceSourceAuthorized(source, ctx.discovery))) {
    throw new DomainAudienceError(
      "SOURCE_UNAUTHORIZED",
      `Domain audience source "${ref.sourceKey}" is not authorized for this caller.`,
    );
  }

  let expanded: ZielgruppeAudienceComponent;
  try {
    if (source.resolveAudienceComponent) {
      expanded = await source.resolveAudienceComponent({
        tenantId: ctx.tenantId,
        senderUserId: ctx.senderUserId,
        candidateId: ref.candidateId,
      });
    } else {
      expanded = source.toAudienceComponent(ref.candidateId);
    }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new DomainAudienceError(
      "CANDIDATE_RESOLUTION_FAILED",
      `Domain audience "${ref.sourceKey}" could not be resolved: ${detail}`,
    );
  }

  if (expanded.domainAudience && !domainAudienceReferenceIsEmpty(expanded.domainAudience)) {
    throw new DomainAudienceError(
      "CANDIDATE_RESOLUTION_FAILED",
      `Domain audience "${ref.sourceKey}" returned a nested domain reference (not allowed).`,
    );
  }

  return {
    ...component,
    ...expanded,
    domainAudience: undefined,
    label: component.label ?? expanded.label,
  };
}

export async function materializeDomainAudiencesInSpec(
  spec: CommunicationAudienceSpec,
  ctx: DomainAudienceMaterializationContext,
): Promise<CommunicationAudienceSpec> {
  const components = await Promise.all(
    spec.components.map((component) => materializeComponent(component, ctx)),
  );
  return { ...spec, components };
}

export function communicationAudienceSpecHasDomainReferences(
  spec: CommunicationAudienceSpec,
): boolean {
  return spec.components.some(
    (component) =>
      component.domainAudience && !domainAudienceReferenceIsEmpty(component.domainAudience),
  );
}

export function domainAudienceProvenanceLabel(input: {
  reference: DomainAudienceReference;
  fallbackSourceLabel?: string;
}): string {
  ensureDomainAudienceSourcesRegistered();
  const registry = getDomainAudienceSourceRegistry();
  const source = registry.get(input.reference.sourceKey);
  if (source) {
    return source.provenanceLabel(input.reference.candidateId);
  }
  const keyLabel = input.fallbackSourceLabel ?? input.reference.sourceKey;
  return `${keyLabel} (Quelle nicht verfügbar)`;
}

export async function buildDomainAudienceMaterializationContext(input: {
  tenantId: string;
  senderUserId: string;
}): Promise<DomainAudienceMaterializationContext> {
  const { createEffectivePermissionResolver } = await import(
    "@/lib/permissions/services/effective-permission-resolver"
  );
  const { prisma } = await import("@/lib/db/prisma");
  const resolver = createEffectivePermissionResolver(prisma);
  const effective = await resolver.getEffectivePermissions({
    userId: input.senderUserId,
    tenantId: input.tenantId,
  });
  const permissionKeys = new Set([...effective.platform, ...effective.tenant]);
  return {
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    discovery: {
      tenantId: input.tenantId,
      userId: input.senderUserId,
      permissionKeys,
    },
  };
}
