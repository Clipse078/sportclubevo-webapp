"use server";

import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  resolveFinancePublicationActionUserMessage,
  FINANCE_PUBLICATION_INSPECTION_FORBIDDEN,
  FINANCE_PUBLICATION_INSPECTION_NOT_FOUND,
  FINANCE_PUBLICATION_INSPECTION_READ_FAILED,
} from "@/lib/finance/publishing/finance-publication-action-errors";
import { revalidatePath } from "next/cache";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { canPublishFinancialReports } from "@/lib/finance/publishing/finance-publishing-authorization";
import {
  loadFinancePublicationSummaryForYear,
  loadFinancePublicationVersionForTenant,
} from "@/lib/finance/services/finance-publication-query-service";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { serializeFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";
import { getTranslations } from "next-intl/server";

export type FinancePublishManagementPnlActionResult =
  | {
      ok: true;
      publicationId: string;
      versionNumber: number;
      publishedAt: string;
    }
  | { ok: false; error: string };

export async function publishFinanceManagementPnlAction(input: {
  financeYearId: string;
}): Promise<FinancePublishManagementPnlActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    if (!canPublishFinancialReports(workspace.ctx)) {
      return {
        ok: false,
        error: resolveFinancePublicationActionUserMessage(
          new FinanceDomainError(
            "FINANCE_FORBIDDEN",
            "Insufficient permission to publish financial reports.",
            403,
          ),
        ),
      };
    }

    const result = await publishFinanceManagementPnlSnapshot(prisma, workspace.ctx, {
      financeYearId: input.financeYearId,
    });

    revalidatePath("/dashboard/finance/reports");

    return {
      ok: true,
      publicationId: result.publicationId,
      versionNumber: result.versionNumber,
      publishedAt: result.publishedAt.toISOString(),
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}

export type FinancePublicationInspectionResult =
  | {
      ok: true;
      summary: ReturnType<typeof serializeFinancePublicationSummaryReadModel>;
      presentation: FinancePublishedManagementPnlInspectionReadModel | null;
    }
  | { ok: false; error: string };

export async function loadFinancePublicationInspectionAction(input: {
  financeYearId: string;
  publicationId?: string;
  versionNumber?: number;
}): Promise<FinancePublicationInspectionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const t = await getTranslations("Finance.reporting.publication");
    const summary = serializeFinancePublicationSummaryReadModel(
      await loadFinancePublicationSummaryForYear(prisma, workspace.ctx, input.financeYearId),
    );

    if (summary.availability === "RESTRICTED") {
      return { ok: false, error: FINANCE_PUBLICATION_INSPECTION_FORBIDDEN };
    }

    let presentation: FinancePublishedManagementPnlInspectionReadModel | null = null;
    if (input.publicationId && input.versionNumber) {
      const version = await loadFinancePublicationVersionForTenant(prisma, workspace.ctx, {
        publicationId: input.publicationId,
        versionNumber: input.versionNumber,
      });
      if (!version.ok) {
        if ("restricted" in version && version.restricted) {
          return { ok: false, error: FINANCE_PUBLICATION_INSPECTION_FORBIDDEN };
        }
        return { ok: false, error: FINANCE_PUBLICATION_INSPECTION_NOT_FOUND };
      }

      try {
        presentation = buildFinancePublishedManagementPnlInspectionReadModel({
          snapshot: version.snapshot,
          lifecycleStatus: version.lifecycleStatus,
          contentLabel: t("dialogContentValue"),
        });
      } catch (error: unknown) {
        if (error instanceof FinanceDomainError) {
          return { ok: false, error: FINANCE_PUBLICATION_INSPECTION_READ_FAILED };
        }
        throw error;
      }
    }

    return { ok: true, summary, presentation };
  } catch (error: unknown) {
    return {
      ok: false,
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}
