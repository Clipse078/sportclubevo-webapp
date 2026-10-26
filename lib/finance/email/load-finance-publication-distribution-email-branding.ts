import {
  resolveFinancePublicationDistributionSceEmailLogoUrl,
  resolveFinanceTransactionalEmailAssetUrl,
} from "@/lib/finance/email/resolve-finance-transactional-email-asset-url";
import {
  getCurrentTenantContextByIdCached,
  getTenantClubCrestUrlCached,
} from "@/lib/server/request-cache";

export type FinancePublicationDistributionEmailBranding = {
  tenantName: string;
  tenantLogoAbsoluteUrl: string | null;
  sceLogoAbsoluteUrl: string;
};

export async function loadFinancePublicationDistributionEmailBranding(
  tenantId: string,
): Promise<FinancePublicationDistributionEmailBranding> {
  const [tenant, crestUrl] = await Promise.all([
    getCurrentTenantContextByIdCached(tenantId),
    getTenantClubCrestUrlCached(tenantId),
  ]);

  return {
    tenantName: tenant?.name?.trim() || "",
    tenantLogoAbsoluteUrl: resolveFinanceTransactionalEmailAssetUrl(crestUrl),
    sceLogoAbsoluteUrl: resolveFinancePublicationDistributionSceEmailLogoUrl(),
  };
}
