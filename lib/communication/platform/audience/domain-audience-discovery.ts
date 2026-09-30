/**
 * SCE-DOMAIN-AUDIENCE-01 — authorization-aware domain source discovery.
 */

import type {
  DomainAudienceDiscoveryContext,
  DomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-source";
import { getDomainAudienceSourceRegistry } from "@/lib/communication/platform/audience/domain-audience-registry";

export async function listAuthorizedDomainAudienceSources(
  ctx: DomainAudienceDiscoveryContext,
): Promise<DomainAudienceSource[]> {
  const registry = getDomainAudienceSourceRegistry();
  const authorized: DomainAudienceSource[] = [];
  for (const source of registry.list()) {
    if (await isDomainAudienceSourceAuthorized(source, ctx)) {
      authorized.push(source);
    }
  }
  return authorized;
}

export async function isDomainAudienceSourceAuthorized(
  source: DomainAudienceSource,
  ctx: DomainAudienceDiscoveryContext,
): Promise<boolean> {
  if (ctx.tenantId.trim().length === 0) return false;
  if (source.canDiscover) {
    return Boolean(await source.canDiscover(ctx));
  }
  const required = source.requiredPermissions ?? [];
  if (required.length === 0) return false;
  return required.some((permission) => ctx.permissionKeys.has(permission));
}

export async function getAuthorizedDomainAudienceSource(
  ctx: DomainAudienceDiscoveryContext,
  sourceKey: string,
): Promise<DomainAudienceSource | null> {
  const source = getDomainAudienceSourceRegistry().get(sourceKey);
  if (!source) return null;
  if (!(await isDomainAudienceSourceAuthorized(source, ctx))) return null;
  return source;
}
