import { prisma } from "@/lib/db/prisma";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { resolveFinancePublicationShareByRawToken } from "@/lib/finance/services/finance-publication-share-service";
import { logFinancePublicationSharePublicFailure } from "@/lib/finance/server/finance-publication-share-public-diagnostics";
import { resolveFinanceTransactionalEmailAssetUrl } from "@/lib/finance/email/resolve-finance-transactional-email-asset-url";
import {
  getCurrentTenantContextByIdCached,
  getTenantClubCrestUrlCached,
} from "@/lib/server/request-cache";
import { resolveFinanceFormattingLocale } from "@/lib/finance/presentation/resolve-finance-formatting-locale";
import { financePublicationSharePdfApiPath } from "@/lib/finance/publishing/finance-publication-share-path";
import { getTranslations } from "next-intl/server";

export type PublicFinancePublicationShareViewModel =
  | {
      ok: true;
      tenantName: string;
      tenantLogoUrl: string | null;
      formattingLocale: string;
      presentation: ReturnType<typeof buildFinancePublishedManagementPnlInspectionReadModel>;
      versionNumber: number;
      pdfDownloadPath: string;
    }
  | { ok: false };

export async function loadPublicFinancePublicationShareViewModel(
  rawToken: string,
): Promise<PublicFinancePublicationShareViewModel> {
  try {
    const resolved = await resolveFinancePublicationShareByRawToken(prisma, rawToken, {
      recordAccess: true,
    });
    if (!resolved.ok) {
      return { ok: false };
    }

    const [tenant, crestUrl] = await Promise.all([
      getCurrentTenantContextByIdCached(resolved.tenantId),
      getTenantClubCrestUrlCached(resolved.tenantId),
    ]);
    if (!tenant) {
      return { ok: false };
    }

    const pub = await getTranslations("Finance.reporting.publication");
    let presentation;
    try {
      presentation = buildFinancePublishedManagementPnlInspectionReadModel({
        snapshot: resolved.snapshot,
        lifecycleStatus: resolved.lifecycleStatus,
        contentLabel: pub("dialogContentValue"),
      });
    } catch {
      return { ok: false };
    }

    const tenantLogoUrl =
      resolveFinanceTransactionalEmailAssetUrl(crestUrl) ??
      resolveFinanceTransactionalEmailAssetUrl(tenant.logoUrl);

    return {
      ok: true,
      tenantName: tenant.name,
      tenantLogoUrl,
      formattingLocale: resolveFinanceFormattingLocale(tenant),
      presentation,
      versionNumber: resolved.versionNumber,
      pdfDownloadPath: financePublicationSharePdfApiPath(rawToken),
    };
  } catch (error: unknown) {
    logFinancePublicationSharePublicFailure("public-view-model", error);
    return { ok: false };
  }
}
