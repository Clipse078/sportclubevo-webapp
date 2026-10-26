/**
 * FIN-06D — controlled publication version sharing.
 *
 * SHARE TARGET = immutable FinancePublicationVersion (never live FIN-05, never latest).
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import {
  auditFinancePublicationShareCreated,
  auditFinancePublicationShareRevoked,
  auditFinancePublicationShareAccessed,
} from "@/lib/finance/audit/finance-publication-share-audit";
import {
  deriveFinancePublicationShareStatus,
  isFinancePublicationShareExternallyAccessible,
  type FinancePublicationShareDerivedStatus,
} from "@/lib/finance/publishing/finance-publication-share-status";
import { financePublicationSharePath } from "@/lib/finance/publishing/finance-publication-share-path";
import {
  generateFinancePublicationSharePublicToken,
  hashFinanceShareLinkToken,
} from "@/lib/finance/publishing/finance-share-link-token";
import {
  canViewFinancePublicationHistory,
  requireFinancePublicationShareCreate,
  requireFinancePublicationShareManagement,
  requireFinanceShareManage,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { parseFinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/validate-finance-publication-snapshot-v1";
import { loadFinancePublicationVersionSnapshot } from "@/lib/finance/services/finance-publication-service";

type Db = Pick<
  PrismaClient,
  | "$transaction"
  | "financePublication"
  | "financePublicationVersion"
  | "financePublicationShare"
  | "financeYear"
  | "auditLog"
  | "user"
>;

export type FinancePublicationShareListItem = {
  id: string;
  status: FinancePublicationShareDerivedStatus;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdByDisplayName: string | null;
  versionNumber: number;
  shareKind: "DEFAULT" | "ADVANCED" | "DISTRIBUTION";
  relativeSharePath: string | null;
};

export type CreateFinancePublicationShareInput = {
  publicationId: string;
  versionNumber: number;
  expiresAt: Date | null;
  shareKind?: "DEFAULT" | "ADVANCED";
};

export type FinancePublicationShareLinkResult = {
  shareId: string;
  publicToken: string;
  relativeSharePath: string;
  expiresAt: string | null;
  versionNumber: number;
  reused: boolean;
};

export type ResolvedFinancePublicationShareAccess =
  | {
      ok: true;
      tenantId: string;
      shareId: string;
      publicationId: string;
      publicationVersionId: string;
      versionNumber: number;
      snapshot: ReturnType<typeof parseFinancePublicationSnapshotPayloadV1>;
      lifecycleStatus: string;
      publishedAt: Date | null;
    }
  | { ok: false; reason: "UNAVAILABLE" };

function normalizePublicShareToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 512) return null;
  return trimmed;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function loadPublishedVersionForShare(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
) {
  const versionRead = await loadFinancePublicationVersionSnapshot(db, ctx, input);
  if (!versionRead.ok) {
    if ("restricted" in versionRead && versionRead.restricted) {
      throw new FinanceDomainError(
        "FINANCE_FORBIDDEN",
        "Insufficient permission to share this publication.",
        403,
      );
    }
    throw new FinanceDomainError(
      "FINANCE_NOT_FOUND",
      "Publication version not found.",
      404,
    );
  }
  if (versionRead.lifecycleStatus !== "PUBLISHED" && versionRead.lifecycleStatus !== "SUPERSEDED") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_NOT_PUBLISHABLE",
      "Only published official versions can be shared.",
      400,
    );
  }
  return versionRead;
}

async function loadVersionRow(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
) {
  const versionRead = await loadPublishedVersionForShare(db, ctx, input);
  const versionRow = await db.financePublicationVersion.findFirst({
    where: {
      tenantId: ctx.tenantId,
      publicationId: versionRead.publicationId,
      versionNumber: versionRead.versionNumber,
    },
    select: { id: true, publicationId: true, versionNumber: true },
  });
  if (!versionRow) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }
  return versionRow;
}

function mapShareLinkResult(input: {
  shareId: string;
  publicToken: string;
  expiresAt: Date | null;
  versionNumber: number;
  reused: boolean;
}): FinancePublicationShareLinkResult {
  return {
    shareId: input.shareId,
    publicToken: input.publicToken,
    relativeSharePath: financePublicationSharePath(input.publicToken),
    expiresAt: input.expiresAt?.toISOString() ?? null,
    versionNumber: input.versionNumber,
    reused: input.reused,
  };
}

async function findActiveDefaultShare(
  db: Db,
  input: { tenantId: string; publicationVersionId: string },
) {
  return db.financePublicationShare.findFirst({
    where: {
      tenantId: input.tenantId,
      publicationVersionId: input.publicationVersionId,
      shareKind: "DEFAULT",
      revokedAt: null,
      expiresAt: null,
    },
    select: {
      id: true,
      publicToken: true,
      expiresAt: true,
      publicationVersion: { select: { versionNumber: true } },
    },
  });
}

export async function getActiveDefaultFinancePublicationShareLink(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
): Promise<FinancePublicationShareLinkResult | null> {
  requireFinancePublicationShareCreate(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view publications for sharing.",
      403,
    );
  }

  const versionRow = await loadVersionRow(db, ctx, input);
  const existing = await findActiveDefaultShare(db, {
    tenantId: ctx.tenantId,
    publicationVersionId: versionRow.id,
  });
  if (!existing?.publicToken) {
    return null;
  }
  return mapShareLinkResult({
    shareId: existing.id,
    publicToken: existing.publicToken,
    expiresAt: existing.expiresAt,
    versionNumber: existing.publicationVersion.versionNumber,
    reused: true,
  });
}

export async function ensureDefaultFinancePublicationShare(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
): Promise<FinancePublicationShareLinkResult> {
  requireFinancePublicationShareCreate(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view publications for sharing.",
      403,
    );
  }

  const versionRow = await loadVersionRow(db, ctx, input);

  return db.$transaction(async (tx) => {
    const existing = await findActiveDefaultShare(tx, {
      tenantId: ctx.tenantId,
      publicationVersionId: versionRow.id,
    });
    if (existing?.publicToken) {
      return mapShareLinkResult({
        shareId: existing.id,
        publicToken: existing.publicToken,
        expiresAt: existing.expiresAt,
        versionNumber: existing.publicationVersion.versionNumber,
        reused: true,
      });
    }

    const publicToken = generateFinancePublicationSharePublicToken();
    try {
      const share = await tx.financePublicationShare.create({
        data: {
          tenantId: ctx.tenantId,
          publicationId: versionRow.publicationId,
          publicationVersionId: versionRow.id,
          publicToken,
          tokenHash: null,
          shareKind: "DEFAULT",
          expiresAt: null,
          createdByUserId: ctx.userId,
        },
        select: {
          id: true,
          expiresAt: true,
          publicationVersion: { select: { versionNumber: true } },
        },
      });

      await auditFinancePublicationShareCreated(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        shareId: share.id,
        publicationId: versionRow.publicationId,
        publicationVersionId: versionRow.id,
        versionNumber: share.publicationVersion.versionNumber,
        expiresAt: share.expiresAt,
      });

      return mapShareLinkResult({
        shareId: share.id,
        publicToken,
        expiresAt: share.expiresAt,
        versionNumber: share.publicationVersion.versionNumber,
        reused: false,
      });
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      const raced = await findActiveDefaultShare(tx, {
        tenantId: ctx.tenantId,
        publicationVersionId: versionRow.id,
      });
      if (!raced?.publicToken) {
        throw error;
      }
      return mapShareLinkResult({
        shareId: raced.id,
        publicToken: raced.publicToken,
        expiresAt: raced.expiresAt,
        versionNumber: raced.publicationVersion.versionNumber,
        reused: true,
      });
    }
  });
}

/** Advanced / explicit share (optional expiry). Does not replace DEFAULT reuse semantics. */
export async function createFinancePublicationShare(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinancePublicationShareInput,
): Promise<FinancePublicationShareLinkResult> {
  requireFinancePublicationShareCreate(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view publications for sharing.",
      403,
    );
  }

  const versionRow = await loadVersionRow(db, ctx, {
    publicationId: input.publicationId,
    versionNumber: input.versionNumber,
  });

  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_TRANSITION",
      "Expiry must be in the future.",
      400,
    );
  }

  const shareKind = input.shareKind ?? (input.expiresAt ? "ADVANCED" : "DEFAULT");
  if (shareKind === "DEFAULT" && !input.expiresAt) {
    return ensureDefaultFinancePublicationShare(db, ctx, {
      publicationId: input.publicationId,
      versionNumber: input.versionNumber,
    });
  }

  const publicToken = generateFinancePublicationSharePublicToken();

  const created = await db.$transaction(async (tx) => {
    const share = await tx.financePublicationShare.create({
      data: {
        tenantId: ctx.tenantId,
        publicationId: versionRow.publicationId,
        publicationVersionId: versionRow.id,
        publicToken,
        tokenHash: null,
        shareKind: "ADVANCED",
        expiresAt: input.expiresAt,
        createdByUserId: ctx.userId,
      },
      select: {
        id: true,
        expiresAt: true,
        publicationVersion: { select: { versionNumber: true } },
      },
    });

    await auditFinancePublicationShareCreated(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      shareId: share.id,
      publicationId: versionRow.publicationId,
      publicationVersionId: versionRow.id,
      versionNumber: share.publicationVersion.versionNumber,
      expiresAt: share.expiresAt,
    });

    return share;
  });

  return mapShareLinkResult({
    shareId: created.id,
    publicToken,
    expiresAt: created.expiresAt,
    versionNumber: created.publicationVersion.versionNumber,
    reused: false,
  });
}

export async function listFinancePublicationSharesForVersion(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
): Promise<FinancePublicationShareListItem[]> {
  requireFinancePublicationShareManagement(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const publication = await db.financePublication.findFirst({
    where: { id: input.publicationId.trim(), tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!publication) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication not found.", 404);
  }

  const version = await db.financePublicationVersion.findFirst({
    where: {
      tenantId: ctx.tenantId,
      publicationId: publication.id,
      versionNumber: input.versionNumber,
    },
    select: { id: true, versionNumber: true },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }

  const rows = await db.financePublicationShare.findMany({
    where: {
      tenantId: ctx.tenantId,
      publicationVersionId: version.id,
      shareKind: { not: "DISTRIBUTION" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      shareKind: true,
      publicToken: true,
      createdBy: { select: { firstName: true, lastName: true } },
      publicationVersion: { select: { versionNumber: true } },
    },
  });

  const now = new Date();
  return rows.map((row) => {
    const status = deriveFinancePublicationShareStatus({
      revokedAt: row.revokedAt,
      expiresAt: row.expiresAt,
      now,
    });
    return {
      id: row.id,
      status,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdByDisplayName: row.createdBy
        ? `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim()
        : null,
      versionNumber: row.publicationVersion.versionNumber,
      shareKind: row.shareKind,
      relativeSharePath:
        row.publicToken && status === "ACTIVE"
          ? financePublicationSharePath(row.publicToken)
          : null,
    };
  });
}

export async function revokeFinancePublicationShare(
  db: Db,
  ctx: FinanceAuthContext,
  input: { shareId: string },
): Promise<void> {
  requireFinanceShareManage(ctx);

  const share = await db.financePublicationShare.findFirst({
    where: { id: input.shareId.trim(), tenantId: ctx.tenantId },
    include: {
      publicationVersion: { select: { id: true, versionNumber: true } },
    },
  });
  if (!share) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Share not found.", 404);
  }

  assertSameTenant(ctx.tenantId, share.tenantId);

  if (share.revokedAt) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_VERSION_CONFLICT",
      "Share is already revoked.",
      409,
    );
  }

  await db.$transaction(async (tx) => {
    const updated = await tx.financePublicationShare.updateMany({
      where: {
        id: share.id,
        tenantId: ctx.tenantId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedByUserId: ctx.userId,
      },
    });
    if (updated.count !== 1) {
      throw new FinanceDomainError(
        "FINANCE_PUBLICATION_VERSION_CONFLICT",
        "Share is already revoked.",
        409,
      );
    }

    await auditFinancePublicationShareRevoked(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      shareId: share.id,
      publicationId: share.publicationId,
      publicationVersionId: share.publicationVersion.id,
      versionNumber: share.publicationVersion.versionNumber,
    });
  });
}

async function loadShareByCapabilityToken(db: Db, capabilityToken: string) {
  const byPublic = await db.financePublicationShare.findUnique({
    where: { publicToken: capabilityToken },
    include: {
      publicationVersion: {
        select: {
          id: true,
          tenantId: true,
          publicationId: true,
          versionNumber: true,
          lifecycleStatus: true,
          publishedAt: true,
          snapshotPayloadJson: true,
        },
      },
    },
  });
  if (byPublic) {
    return byPublic;
  }

  const tokenHash = hashFinanceShareLinkToken(capabilityToken);
  return db.financePublicationShare.findUnique({
    where: { tokenHash },
    include: {
      publicationVersion: {
        select: {
          id: true,
          tenantId: true,
          publicationId: true,
          versionNumber: true,
          lifecycleStatus: true,
          publishedAt: true,
          snapshotPayloadJson: true,
        },
      },
    },
  });
}

export async function resolveFinancePublicationShareByRawToken(
  db: Db,
  rawTokenInput: string,
  options?: { recordAccess?: boolean; now?: Date },
): Promise<ResolvedFinancePublicationShareAccess> {
  const rawToken = normalizePublicShareToken(rawTokenInput);
  if (!rawToken) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  const share = await loadShareByCapabilityToken(db, rawToken);

  if (!share?.publicationVersion) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  if (share.publicationVersion.tenantId !== share.tenantId) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  const now = options?.now ?? new Date();
  if (
    !isFinancePublicationShareExternallyAccessible({
      revokedAt: share.revokedAt,
      expiresAt: share.expiresAt,
      now,
    })
  ) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  let snapshot;
  try {
    snapshot = parseFinancePublicationSnapshotPayloadV1(share.publicationVersion.snapshotPayloadJson);
  } catch {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  if (snapshot.publicationVersion !== share.publicationVersion.versionNumber) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  if (options?.recordAccess) {
    const accessCount = share.accessCount + 1;
    await db.$transaction(async (tx) => {
      await tx.financePublicationShare.update({
        where: { id: share.id },
        data: {
          accessCount,
          lastAccessedAt: now,
        },
      });
      await auditFinancePublicationShareAccessed(tx, {
        tenantId: share.tenantId,
        shareId: share.id,
        publicationId: share.publicationId,
        publicationVersionId: share.publicationVersion.id,
        versionNumber: share.publicationVersion.versionNumber,
        accessCount,
      });
    });
  }

  return {
    ok: true,
    tenantId: share.tenantId,
    shareId: share.id,
    publicationId: share.publicationId,
    publicationVersionId: share.publicationVersion.id,
    versionNumber: share.publicationVersion.versionNumber,
    snapshot,
    lifecycleStatus: share.publicationVersion.lifecycleStatus,
    publishedAt: share.publicationVersion.publishedAt,
  };
}

export async function loadFinancePublicationShareContextForPdf(
  db: Db,
  rawToken: string,
): Promise<ResolvedFinancePublicationShareAccess> {
  return resolveFinancePublicationShareByRawToken(db, rawToken, { recordAccess: false });
}
