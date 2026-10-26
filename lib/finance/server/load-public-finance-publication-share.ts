import { prisma } from "@/lib/db/prisma";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { resolveFinancePublicationShareByRawToken } from "@/lib/finance/services/finance-publication-share-service";
import { getCurrentTenantContextByIdCached } from "@/lib/server/request-cache";
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
  const resolved = await resolveFinancePublicationShareByRawToken(prisma, rawToken, {
    recordAccess: true,
  });
  if (!resolved.ok) {
    return { ok: false };
  }

  const tenant = await getCurrentTenantContextByIdCached(resolved.tenantId);
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

  return {
    ok: true,
    tenantName: tenant.name,
    tenantLogoUrl: tenant.logoUrl ?? null,
    formattingLocale: resolveFinanceFormattingLocale(tenant),
    presentation,
    versionNumber: resolved.versionNumber,
    pdfDownloadPath: financePublicationSharePdfApiPath(rawToken),
  };
}
