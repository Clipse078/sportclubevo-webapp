/**
 * FIN-06C-R1 — publication artifact generation (snapshot authority only).
 */

import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { generateFinancePublicationPdf } from "@/lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf";
import type { FinancePublicationPdfLabels } from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";
import type { FinancePublicationPdfGenerationResult } from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";
import { loadFinancePublicationVersionSnapshot } from "@/lib/finance/services/finance-publication-service";
import { getCurrentTenantContextByIdCached } from "@/lib/server/request-cache";
import { resolveFinanceFormattingLocale } from "@/lib/finance/presentation/resolve-finance-formatting-locale";
import { loadTenantPublicationLogo } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-images";

export type GenerateFinancePublicationPdfArtifactInput = {
  publicationId: string;
  versionNumber: number;
  labels: FinancePublicationPdfLabels;
  reportTypeContentLabel: string;
  generatedAt?: Date;
};

export type GenerateFinancePublicationPdfArtifactResult =
  | ({ ok: true } & FinancePublicationPdfGenerationResult)
  | { ok: false; notFound: true }
  | { ok: false; forbidden: true }
  | { ok: false; generationFailed: true; message: string };

export async function generateFinancePublicationPdfArtifactForTenant(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
  input: GenerateFinancePublicationPdfArtifactInput,
): Promise<GenerateFinancePublicationPdfArtifactResult> {
  const versionRead = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: input.publicationId,
    versionNumber: input.versionNumber,
  });

  if (!versionRead.ok) {
    if ("restricted" in versionRead && versionRead.restricted) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, notFound: true };
  }

  let presentation;
  try {
    presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot: versionRead.snapshot,
      lifecycleStatus: versionRead.lifecycleStatus,
      contentLabel: input.reportTypeContentLabel,
    });
  } catch (error: unknown) {
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        generationFailed: true,
        message: error.message,
      };
    }
    throw error;
  }

  const tenant = await getCurrentTenantContextByIdCached(ctx.tenantId);
  const organisationName = tenant?.name?.trim() || presentation.identity.title;
  const formattingLocale = tenant
    ? resolveFinanceFormattingLocale(tenant)
    : "en-GB";

  const generatedAt = input.generatedAt ?? new Date();
  const tenantLogo = await loadTenantPublicationLogo(tenant?.logoUrl ?? null);

  try {
    const pdf = await generateFinancePublicationPdf({
      organisationName,
      formattingLocale,
      translationLocale: tenant?.locale?.trim() || formattingLocale,
      documentLanguage: tenant?.locale?.trim() || formattingLocale,
      generatedAt,
      presentation,
      labels: input.labels,
      organisationLogoBytes: tenantLogo?.bytes ?? null,
      organisationLogoMime: tenantLogo?.mime ?? null,
    });

    return { ok: true, ...pdf };
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "PDF could not be generated.";
    return { ok: false, generationFailed: true, message };
  }
}
