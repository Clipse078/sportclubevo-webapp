"use server";

import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveFinancePublicationActionUserMessage } from "@/lib/finance/publishing/finance-publication-action-errors";
import { revalidatePath } from "next/cache";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { canPublishFinancialReports } from "@/lib/finance/publishing/finance-publishing-authorization";
import {
  loadFinancePublicationSummaryForYear,
  loadFinancePublicationVersionForTenant,
} from "@/lib/finance/services/finance-publication-query-service";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import { serializeFinancePublicationSnapshotPayload } from "@/lib/finance/presentation/serialize-publication-snapshot";

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
      summary: Awaited<ReturnType<typeof loadFinancePublicationSummaryForYear>>;
      latestSnapshot: ReturnType<typeof serializeFinancePublicationSnapshotPayload> | null;
    }
  | { ok: false; error: string };

export async function loadFinancePublicationInspectionAction(input: {
  financeYearId: string;
  publicationId?: string;
  versionNumber?: number;
}): Promise<FinancePublicationInspectionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const summary = await loadFinancePublicationSummaryForYear(
      prisma,
      workspace.ctx,
      input.financeYearId,
    );

    let latestSnapshot = null;
    if (input.publicationId && input.versionNumber) {
      const version = await loadFinancePublicationVersionForTenant(prisma, workspace.ctx, {
        publicationId: input.publicationId,
        versionNumber: input.versionNumber,
      });
      if (version.ok) {
        latestSnapshot = serializeFinancePublicationSnapshotPayload(version.snapshot);
      }
    }

    return { ok: true, summary, latestSnapshot };
  } catch (error: unknown) {
    return {
      ok: false,
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}
