/**
 * FIN-06E — distribute immutable publication versions via recipient-specific email delivery.
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import {
  auditFinancePublicationDistributionCompleted,
  auditFinancePublicationDistributionCreated,
} from "@/lib/finance/audit/finance-publication-distribution-audit";
import {
  FinancePublicationDistributionEmailDeliveryError,
  type FinancePublicationDistributionEmailPort,
} from "@/lib/finance/delivery/finance-publication-distribution-email-port";
import { financePublicationDistributionEmailPort } from "@/lib/finance/delivery/resend-finance-publication-distribution-email-adapter";
import {
  buildFinancePublicationDistributionEmail,
  type FinancePublicationDistributionEmailLabels,
} from "@/lib/finance/email/build-finance-publication-distribution-email";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { auditFinancePublicationShareCreated } from "@/lib/finance/audit/finance-publication-share-audit";
import {
  FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE,
  FINANCE_PUBLICATION_DISTRIBUTION_MESSAGE_MAX_LENGTH,
  type FinancePublicationDistributionRecipientInput,
} from "@/lib/finance/publishing/finance-publication-distribution-contract";
import {
  canViewFinancePublicationHistory,
  requireFinancePublicationDistributionView,
  requireFinanceReportingDistribute,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { generateFinancePublicationSharePublicToken } from "@/lib/finance/publishing/finance-share-link-token";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { loadFinancePublicationVersionSnapshot } from "@/lib/finance/services/finance-publication-service";
import { searchDiscoverableTenantPersons } from "@/lib/people/tenant-person-discovery";

type Db = Pick<
  PrismaClient,
  | "$transaction"
  | "financePublication"
  | "financePublicationVersion"
  | "financePublicationShare"
  | "financePublicationDistribution"
  | "financePublicationDistributionRecipient"
  | "financeYear"
  | "person"
  | "tenant"
  | "user"
  | "auditLog"
>;

export type FinancePublicationDistributionSummary = {
  id: string;
  createdAt: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};

export type FinancePublicationDistributionRecipientDetail = {
  id: string;
  recipientDisplayName: string | null;
  recipientEmailMasked: string;
  isExternalRecipient: boolean;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
};

export type FinancePublicationDistributionDetail = FinancePublicationDistributionSummary & {
  optionalMessage: string | null;
  versionNumber: number;
  recipients: FinancePublicationDistributionRecipientDetail[];
};

export type CreateFinancePublicationDistributionInput = {
  publicationId: string;
  versionNumber: number;
  idempotencyKey: string;
  optionalMessage?: string | null;
  localeCode: string;
  recipients: FinancePublicationDistributionRecipientInput[];
  emailLabels: FinancePublicationDistributionEmailLabels;
};

export type CreateFinancePublicationDistributionResult = {
  distributionId: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  reused: boolean;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const visible = local.length <= 2 ? local[0] ?? "•" : `${local.slice(0, 2)}•••`;
  return `${visible}@${domain}`;
}

function normalizeOptionalMessage(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > FINANCE_PUBLICATION_DISTRIBUTION_MESSAGE_MAX_LENGTH) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_TRANSITION",
      `Message must be at most ${FINANCE_PUBLICATION_DISTRIBUTION_MESSAGE_MAX_LENGTH} characters.`,
      400,
    );
  }
  return trimmed;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function loadPublishedVersionRow(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
) {
  const versionRead = await loadFinancePublicationVersionSnapshot(db, ctx, input);
  if (!versionRead.ok) {
    if ("restricted" in versionRead && versionRead.restricted) {
      throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
    }
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }
  if (versionRead.lifecycleStatus !== "PUBLISHED" && versionRead.lifecycleStatus !== "SUPERSEDED") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_NOT_PUBLISHABLE",
      "Only published official versions can be distributed.",
      400,
    );
  }
  const versionRow = await db.financePublicationVersion.findFirst({
    where: {
      tenantId: ctx.tenantId,
      publicationId: versionRead.publicationId,
      versionNumber: versionRead.versionNumber,
    },
    select: {
      id: true,
      publicationId: true,
      versionNumber: true,
      publishedAt: true,
    },
  });
  if (!versionRow) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }
  const publication = await db.financePublication.findFirst({
    where: { id: versionRow.publicationId, tenantId: ctx.tenantId },
    select: { title: true, financeYearId: true },
  });
  if (!publication) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication not found.", 404);
  }
  const financeYear = await db.financeYear.findFirst({
    where: { id: publication.financeYearId, tenantId: ctx.tenantId },
    select: { name: true },
  });
  if (!financeYear) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Finance year not found.", 404);
  }
  return {
    ...versionRow,
    publication: { title: publication.title, financeYear: { name: financeYear.name } },
  };
}

async function resolveRecipientRows(
  db: Db,
  ctx: FinanceAuthContext,
  recipients: FinancePublicationDistributionRecipientInput[],
) {
  if (recipients.length === 0) {
    throw new FinanceDomainError("FINANCE_PUBLICATION_INVALID_TRANSITION", "Select at least one recipient.", 400);
  }
  if (recipients.length > 50) {
    throw new FinanceDomainError("FINANCE_PUBLICATION_INVALID_TRANSITION", "Too many recipients.", 400);
  }

  const normalized: Array<{
    personId: string | null;
    email: string;
    displayName: string | null;
    isExternal: boolean;
  }> = [];
  const seenEmails = new Set<string>();

  for (const recipient of recipients) {
    if (recipient.kind === "EXTERNAL") {
      const syntax = validateInvitationEmailSyntax(recipient.email);
      if (!syntax.ok) {
        throw new FinanceDomainError("FINANCE_PUBLICATION_INVALID_TRANSITION", "Invalid recipient email.", 400);
      }
      const email = syntax.normalized.toLowerCase();
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
      normalized.push({
        personId: null,
        email,
        displayName: recipient.displayName?.trim() || null,
        isExternal: true,
      });
      continue;
    }

    const person = await db.person.findFirst({
      where: { id: recipient.personId.trim(), tenantId: ctx.tenantId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });
    if (!person) {
      throw new FinanceDomainError("FINANCE_NOT_FOUND", "Recipient not found.", 404);
    }
    const email = person.email?.trim().toLowerCase() ?? "";
    if (!email) {
      throw new FinanceDomainError(
        "FINANCE_PUBLICATION_INVALID_TRANSITION",
        "Selected person has no email address.",
        400,
      );
    }
    const syntax = validateInvitationEmailSyntax(email);
    if (!syntax.ok) {
      throw new FinanceDomainError(
        "FINANCE_PUBLICATION_INVALID_TRANSITION",
        "Selected person has an invalid email address.",
        400,
      );
    }
    if (seenEmails.has(syntax.normalized)) continue;
    seenEmails.add(syntax.normalized);
    const displayName =
      person.displayName?.trim() ||
      `${person.firstName} ${person.lastName}`.trim() ||
      null;
    normalized.push({
      personId: person.id,
      email: syntax.normalized,
      displayName,
      isExternal: false,
    });
  }

  if (normalized.length === 0) {
    throw new FinanceDomainError("FINANCE_PUBLICATION_INVALID_TRANSITION", "Select at least one recipient.", 400);
  }

  return normalized;
}

function deriveDistributionStatus(sentCount: number, failedCount: number): string {
  if (sentCount === 0 && failedCount > 0) return "FAILED";
  if (failedCount > 0) return "PARTIAL";
  return "COMPLETED";
}

async function deliverRecipientEmail(input: {
  emailPort: FinancePublicationDistributionEmailPort;
  tenantId: string;
  distributionId: string;
  recipientId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  return input.emailPort.send({
    tenantId: input.tenantId,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    idempotencyKey: `finance-pub-dist:${input.distributionId}:${input.recipientId}`,
  });
}

export type FinancePublicationDistributionPersonCandidate = {
  personId: string;
  displayName: string;
  email: string;
};

export async function searchFinancePublicationDistributionPersonCandidates(
  db: Db,
  ctx: FinanceAuthContext,
  input: { query: string; limit?: number },
): Promise<FinancePublicationDistributionPersonCandidate[]> {
  requireFinanceReportingDistribute(ctx);
  void db;
  const rows = await searchDiscoverableTenantPersons(
    ctx.tenantId,
    input.query,
    input.limit ?? 20,
  );
  return rows
    .filter((row) => row.email?.trim())
    .map((row) => ({
      personId: row.personId,
      displayName: row.displayName,
      email: row.email!.trim().toLowerCase(),
    }));
}

export async function createFinancePublicationDistribution(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinancePublicationDistributionInput,
  deps: { emailPort?: FinancePublicationDistributionEmailPort } = {},
): Promise<CreateFinancePublicationDistributionResult> {
  requireFinanceReportingDistribute(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new FinanceDomainError("FINANCE_PUBLICATION_INVALID_TRANSITION", "Invalid idempotency key.", 400);
  }

  const existing = await db.financePublicationDistribution.findFirst({
    where: { tenantId: ctx.tenantId, idempotencyKey },
    include: {
      recipients: { select: { status: true } },
    },
  });
  if (existing) {
    const sentCount = existing.recipients.filter((r) => r.status === "SENT").length;
    const failedCount = existing.recipients.filter((r) => r.status === "FAILED").length;
    return {
      distributionId: existing.id,
      status: existing.status,
      recipientCount: existing.recipients.length,
      sentCount,
      failedCount,
      reused: true,
    };
  }

  const versionRow = await loadPublishedVersionRow(db, ctx, {
    publicationId: input.publicationId,
    versionNumber: input.versionNumber,
  });
  const optionalMessage = normalizeOptionalMessage(input.optionalMessage);
  const recipientRows = await resolveRecipientRows(db, ctx, input.recipients);

  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true },
  });
  if (!tenant) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Tenant not found.", 404);
  }

  const actor = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { firstName: true, lastName: true },
  });
  const senderDisplayName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : null;

  const publishedAtLabel = versionRow.publishedAt
    ? new Intl.DateTimeFormat(input.localeCode, { dateStyle: "medium", timeStyle: "short" }).format(
        versionRow.publishedAt,
      )
    : "—";

  const emailPort = deps.emailPort ?? financePublicationDistributionEmailPort;

  const { distributionId, recipientDeliveries } = await db.$transaction(async (tx) => {
    const distribution = await tx.financePublicationDistribution.create({
      data: {
        tenantId: ctx.tenantId,
        publicationId: versionRow.publicationId,
        publicationVersionId: versionRow.id,
        createdByUserId: ctx.userId,
        optionalMessage,
        status: "PROCESSING",
        idempotencyKey,
        localeCode: input.localeCode,
      },
    });

    const deliveries: Array<{
      recipientId: string;
      email: string;
      sharePublicToken: string;
    }> = [];

    for (const row of recipientRows) {
      const publicToken = generateFinancePublicationSharePublicToken();
      const share = await tx.financePublicationShare.create({
        data: {
          tenantId: ctx.tenantId,
          publicationId: versionRow.publicationId,
          publicationVersionId: versionRow.id,
          publicToken,
          tokenHash: null,
          shareKind: "DISTRIBUTION",
          expiresAt: null,
          createdByUserId: ctx.userId,
        },
      });

      await auditFinancePublicationShareCreated(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        shareId: share.id,
        publicationId: versionRow.publicationId,
        publicationVersionId: versionRow.id,
        versionNumber: versionRow.versionNumber,
        expiresAt: null,
      });

      const recipient = await tx.financePublicationDistributionRecipient.create({
        data: {
          tenantId: ctx.tenantId,
          distributionId: distribution.id,
          personId: row.personId,
          recipientEmail: row.email,
          recipientDisplayName: row.displayName,
          isExternalRecipient: row.isExternal,
          publicationShareId: share.id,
          status: "PENDING",
        },
      });

      deliveries.push({
        recipientId: recipient.id,
        email: row.email,
        sharePublicToken: publicToken,
      });
    }

    await auditFinancePublicationDistributionCreated(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      distributionId: distribution.id,
      publicationId: versionRow.publicationId,
      publicationVersionId: versionRow.id,
      versionNumber: versionRow.versionNumber,
      recipientCount: deliveries.length,
    });

    return { distributionId: distribution.id, recipientDeliveries: deliveries };
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const delivery of recipientDeliveries) {
    const rendered = buildFinancePublicationDistributionEmail({
      labels: input.emailLabels,
      tenantName: tenant.name,
      reportTitle: versionRow.publication.title,
      financeYearLabel: versionRow.publication.financeYear.name,
      versionNumber: versionRow.versionNumber,
      publishedAtLabel,
      senderDisplayName,
      optionalMessage,
      sharePublicToken: delivery.sharePublicToken,
      locale: input.localeCode,
    });

    try {
      const result = await deliverRecipientEmail({
        emailPort,
        tenantId: ctx.tenantId,
        distributionId,
        recipientId: delivery.recipientId,
        to: delivery.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      await db.financePublicationDistributionRecipient.update({
        where: { id: delivery.recipientId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          deliveryMetadataJson: {
            provider: result.provider,
            providerMessageId: result.providerMessageId,
          },
        },
      });
      sentCount += 1;
    } catch (error) {
      const code =
        error instanceof FinancePublicationDistributionEmailDeliveryError ? error.code : "DELIVERY_FAILED";
      await db.financePublicationDistributionRecipient.update({
        where: { id: delivery.recipientId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureCode: code,
        },
      });
      failedCount += 1;
    }
  }

  const finalStatus = deriveDistributionStatus(sentCount, failedCount);

  await db.financePublicationDistribution.update({
    where: { id: distributionId },
    data: {
      status: finalStatus as "COMPLETED" | "PARTIAL" | "FAILED",
      completedAt: new Date(),
    },
  });

  await auditFinancePublicationDistributionCompleted(db, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    distributionId,
    publicationId: versionRow.publicationId,
    publicationVersionId: versionRow.id,
    versionNumber: versionRow.versionNumber,
    sentCount,
    failedCount,
    status: finalStatus,
  });

  return {
    distributionId,
    status: finalStatus,
    recipientCount: recipientDeliveries.length,
    sentCount,
    failedCount,
    reused: false,
  };
}

export async function listFinancePublicationDistributionSummariesForVersion(
  db: Db,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number; cursorCreatedAt?: string | null },
): Promise<{ distributions: FinancePublicationDistributionSummary[]; hasOlder: boolean }> {
  requireFinancePublicationDistributionView(ctx);

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
    select: { id: true },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Publication version not found.", 404);
  }

  const cursorDate = input.cursorCreatedAt ? new Date(input.cursorCreatedAt) : null;

  const rows = await db.financePublicationDistribution.findMany({
    where: {
      tenantId: ctx.tenantId,
      publicationVersionId: version.id,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE + 1,
    include: {
      recipients: { select: { status: true } },
    },
  });

  const hasOlder = rows.length > FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE;
  const page = hasOlder ? rows.slice(0, FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE) : rows;

  return {
    distributions: page.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
      recipientCount: row.recipients.length,
      sentCount: row.recipients.filter((r) => r.status === "SENT").length,
      failedCount: row.recipients.filter((r) => r.status === "FAILED").length,
    })),
    hasOlder,
  };
}

export async function getFinancePublicationDistributionDetail(
  db: Db,
  ctx: FinanceAuthContext,
  input: { distributionId: string },
): Promise<FinancePublicationDistributionDetail> {
  requireFinancePublicationDistributionView(ctx);

  const row = await db.financePublicationDistribution.findFirst({
    where: { id: input.distributionId.trim(), tenantId: ctx.tenantId },
    include: {
      recipients: true,
      publicationVersion: { select: { versionNumber: true } },
    },
  });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Distribution not found.", 404);
  }

  assertSameTenant(ctx.tenantId, row.tenantId);

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    optionalMessage: row.optionalMessage,
    versionNumber: row.publicationVersion.versionNumber,
    recipientCount: row.recipients.length,
    sentCount: row.recipients.filter((r) => r.status === "SENT").length,
    failedCount: row.recipients.filter((r) => r.status === "FAILED").length,
    recipients: row.recipients.map((recipient) => ({
      id: recipient.id,
      recipientDisplayName: recipient.recipientDisplayName,
      recipientEmailMasked: maskEmail(recipient.recipientEmail),
      isExternalRecipient: recipient.isExternalRecipient,
      status: recipient.status,
      sentAt: recipient.sentAt?.toISOString() ?? null,
      failedAt: recipient.failedAt?.toISOString() ?? null,
      failureCode: recipient.failureCode,
    })),
  };
}
