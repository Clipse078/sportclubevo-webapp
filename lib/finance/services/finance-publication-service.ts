/**
 * FIN-06B — publication snapshot capture, versioning, and persisted reads.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { requireFinanceView } from "@/lib/finance/finance-authorization";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import { assertFinancePublicationLifecycleTransition } from "@/lib/finance/publishing/finance-publication-lifecycle";
import {
  assertFinancePublishingReportingScope,
  defaultManagementPnlPublicationScope,
  managementPnlPublicationScopeKey,
  type FinancePublishingReportingScope,
} from "@/lib/finance/publishing/finance-publication-scope";
import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";
import { FINANCE_MANAGEMENT_PNL_REPORTING_SEMANTIC_VERSION } from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";
import {
  canViewFinancePublicationHistory,
  requireFinanceReportingPublish,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { financePublishingRestrictedState } from "@/lib/finance/publishing/finance-publishing-restricted-state";
import { parseFinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/validate-finance-publication-snapshot-v1";
import { FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION } from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";
import { loadFinanceManagementPnlReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";

type Db = Pick<
  PrismaClient,
  | "$transaction"
  | "financePublication"
  | "financePublicationVersion"
  | "financeYear"
>;

export type PublishFinanceManagementPnlInput = {
  financeYearId: string;
  title?: string;
  /** Ignored if supplied — server derives snapshot totals from FIN-05. */
  clientSnapshotHint?: Record<string, unknown>;
};

export type PublishFinanceManagementPnlResult = {
  publicationId: string;
  versionId: string;
  versionNumber: number;
  publishedAt: Date;
  snapshotSchemaVersion: string;
};

export type FinancePublicationVersionReadResult =
  | {
      ok: true;
      publicationId: string;
      versionNumber: number;
      lifecycleStatus: string;
      publishedAt: Date | null;
      snapshot: FinancePublicationSnapshotPayloadV1;
    }
  | { ok: false; restricted: true; surface: "PUBLICATION" }
  | { ok: false; notFound: true };

function scopeMatchesManagementPnl(
  scopeJson: unknown,
  financeYearId: string,
): scopeJson is FinancePublishingReportingScope {
  if (!scopeJson || typeof scopeJson !== "object") return false;
  const scope = scopeJson as FinancePublishingReportingScope;
  return (
    scope.reportType === "MANAGEMENT_PNL" &&
    scope.financeYearId === financeYearId &&
    managementPnlPublicationScopeKey(financeYearId) ===
      managementPnlPublicationScopeKey(scope.financeYearId)
  );
}

async function findManagementPnlPublication(
  db: Db,
  tenantId: string,
  financeYearId: string,
) {
  const candidates = await db.financePublication.findMany({
    where: { tenantId, financeYearId },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });
  return (
    candidates.find((row) => scopeMatchesManagementPnl(row.reportingScopeJson, financeYearId)) ??
    null
  );
}

export async function publishFinanceManagementPnlSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: PublishFinanceManagementPnlInput,
): Promise<PublishFinanceManagementPnlResult> {
  requireFinanceView(ctx);
  requireFinanceReportingPublish(ctx);

  if (input.clientSnapshotHint && Object.keys(input.clientSnapshotHint).length > 0) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot content must be derived on the server.",
      400,
    );
  }

  const financeYearId = input.financeYearId.trim();
  if (!financeYearId) {
    throw new FinanceDomainError(
      "FINANCE_PUBLISHING_INVALID_SCOPE",
      "Publication requires a finance year.",
      400,
    );
  }

  const year = await db.financeYear.findFirst({
    where: { id: financeYearId, tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, name: true },
  });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const reportingScope = defaultManagementPnlPublicationScope(financeYearId);
  assertFinancePublishingReportingScope(reportingScope);

  const pnlReadModel = await loadFinanceManagementPnlReadModel(db as PrismaClient, ctx, {
    financeYearId,
    actualGrain: "ANNUAL_FULL_YEAR",
  });

  if (pnlReadModel.availability !== "AVAILABLE") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_NOT_PUBLISHABLE",
      "This report is not ready to publish yet.",
      409,
    );
  }

  const title = input.title?.trim() || `${year.name} — Management P&L`;
  const publishedAt = new Date();
  const audienceClass = "INTERNAL_AUTHENTICATED" as const;

  return db.$transaction(async (tx) => {
    const txDb = tx as Db;
    let publication = await findManagementPnlPublication(txDb, ctx.tenantId, financeYearId);

    if (!publication) {
      publication = await txDb.financePublication.create({
        data: {
          tenantId: ctx.tenantId,
          financeYearId,
          title,
          lifecycleStatus: "READY",
          reportingScopeJson: reportingScope as unknown as Prisma.InputJsonValue,
          createdByUserId: ctx.userId,
        },
        include: { versions: true },
      });
    }

    assertSameTenant(publication.tenantId, ctx.tenantId, "Publication");

    const priorPublished = publication.versions.filter((v) => v.lifecycleStatus === "PUBLISHED");
    const nextVersionNumber =
      publication.versions.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;

    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: publication.id,
      publicationVersion: nextVersionNumber,
      title,
      reportingScope,
      audienceClass,
      publisherUserId: ctx.userId ?? "",
      publishedAt,
      pnlReadModel,
    });

    parseFinancePublicationSnapshotPayloadV1(snapshot);

    for (const prior of priorPublished) {
      assertFinancePublicationLifecycleTransition(prior.lifecycleStatus, "SUPERSEDED");
      await txDb.financePublicationVersion.update({
        where: { id: prior.id },
        data: { lifecycleStatus: "SUPERSEDED", supersededAt: publishedAt },
      });
    }

    if (publication.lifecycleStatus === "READY") {
      assertFinancePublicationLifecycleTransition("READY", "PUBLISHED");
    } else if (publication.lifecycleStatus === "PUBLISHED") {
      // Subsequent versions keep container published.
    } else if (publication.lifecycleStatus === "DRAFT") {
      assertFinancePublicationLifecycleTransition("DRAFT", "READY");
      assertFinancePublicationLifecycleTransition("READY", "PUBLISHED");
    } else {
      throw new FinanceDomainError(
        "FINANCE_PUBLICATION_NOT_PUBLISHABLE",
        "Publication cannot be updated in its current state.",
        409,
      );
    }

    const version = await txDb.financePublicationVersion.create({
      data: {
        tenantId: ctx.tenantId,
        publicationId: publication.id,
        versionNumber: nextVersionNumber,
        lifecycleStatus: "PUBLISHED",
        snapshotSchemaVersion: FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION,
        snapshotPayloadJson: snapshot as unknown as Prisma.InputJsonValue,
        currencyCode: snapshot.currencyCode,
        audienceClass,
        sourceMetadataJson: {
          financeYearId,
          reportType: reportingScope.reportType,
          reportingSemanticVersion: FINANCE_MANAGEMENT_PNL_REPORTING_SEMANTIC_VERSION,
          approvedBudgetVersionId: pnlReadModel.approvedBudget.approvedBudgetVersionId,
          currentForecastVersionId: pnlReadModel.currentForecast.currentForecastVersionId,
          actualGrain: pnlReadModel.actualGrain,
        } as Prisma.InputJsonValue,
        publishedAt,
        publishedByUserId: ctx.userId,
      },
    });

    await txDb.financePublication.update({
      where: { id: publication.id },
      data: {
        lifecycleStatus: "PUBLISHED",
        title,
        publishedByUserId: ctx.userId,
        currentVersionId: version.id,
      },
    });

    return {
      publicationId: publication.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      publishedAt,
      snapshotSchemaVersion: version.snapshotSchemaVersion,
    };
  });
}

export async function loadFinancePublicationVersionSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
): Promise<FinancePublicationVersionReadResult> {
  requireFinanceView(ctx);

  if (!canViewFinancePublicationHistory(ctx)) {
    return {
      ok: false,
      restricted: true,
      surface: financePublishingRestrictedState("PUBLICATION").surface,
    };
  }

  const publication = await db.financePublication.findFirst({
    where: { id: input.publicationId.trim(), tenantId: ctx.tenantId },
    select: { id: true, tenantId: true },
  });

  if (!publication) {
    return { ok: false, notFound: true };
  }

  const version = await db.financePublicationVersion.findFirst({
    where: {
      publicationId: publication.id,
      tenantId: ctx.tenantId,
      versionNumber: input.versionNumber,
    },
  });

  if (!version) {
    return { ok: false, notFound: true };
  }

  assertSameTenant(version.tenantId, ctx.tenantId, "Publication version");

  const snapshot = parseFinancePublicationSnapshotPayloadV1(version.snapshotPayloadJson);
  if (snapshot.tenantId !== ctx.tenantId || snapshot.publicationId !== publication.id) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot tenant lineage is invalid.",
      500,
    );
  }
  if (snapshot.publicationVersion !== version.versionNumber) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot version mismatch.",
      500,
    );
  }

  return {
    ok: true,
    publicationId: publication.id,
    versionNumber: version.versionNumber,
    lifecycleStatus: version.lifecycleStatus,
    publishedAt: version.publishedAt,
    snapshot,
  };
}

export async function assertFinancePublicationVersionNotMutated(
  db: Pick<PrismaClient, "financePublicationVersion">,
  versionId: string,
  expectedPayload: FinancePublicationSnapshotPayloadV1,
): Promise<void> {
  const row = await db.financePublicationVersion.findUnique({
    where: { id: versionId },
    select: { lifecycleStatus: true, snapshotPayloadJson: true },
  });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }
  const current = parseFinancePublicationSnapshotPayloadV1(row.snapshotPayloadJson);
  if (JSON.stringify(current) !== JSON.stringify(expectedPayload)) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_IMMUTABLE",
      "Published snapshot payload changed.",
      409,
    );
  }
}
