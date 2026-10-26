"use server";

import { Prisma } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveFinancePublicationActionUserMessage } from "@/lib/finance/publishing/finance-publication-action-errors";
import type { FinancePublicationDistributionRecipientInput } from "@/lib/finance/publishing/finance-publication-distribution-contract";
import {
  createFinancePublicationDistribution,
  getFinancePublicationDistributionDetail,
  listFinancePublicationDistributionSummariesForVersion,
  searchFinancePublicationDistributionPersonCandidates,
  type FinancePublicationDistributionDetail,
  type FinancePublicationDistributionPersonCandidate,
  type FinancePublicationDistributionSummary,
} from "@/lib/finance/services/finance-publication-distribution-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

export type FinancePublicationDistributionActionErrorCode =
  | "SEND_FAILED"
  | "LOAD_FAILED"
  | "INVALID_INPUT";

function logDistributionActionFailure(scope: string, error: unknown): void {
  if (error instanceof FinanceDomainError) {
    console.error(`[finance-publication-distribution] ${scope}`, {
      code: error.code,
      status: error.status,
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[finance-publication-distribution] ${scope}`, {
      prismaCode: error.code,
    });
    return;
  }
  console.error(`[finance-publication-distribution] ${scope}`, {
    message: error instanceof Error ? error.message : "unknown",
  });
}

async function loadDistributionEmailLabels() {
  const t = await getTranslations("Finance.reporting.publicationDistribution.email");
  return {
    subject: t("subject"),
    greeting: t("greeting"),
    intro: t("intro"),
    optionalMessageHeading: t("optionalMessageHeading"),
    viewReportCta: t("viewReportCta"),
    downloadPdfCta: t("downloadPdfCta"),
    footer: t("footer"),
  };
}

export async function searchFinancePublicationDistributionPersonCandidatesAction(input: {
  query: string;
}): Promise<
  | { ok: true; candidates: FinancePublicationDistributionPersonCandidate[] }
  | { ok: false; errorCode: FinancePublicationDistributionActionErrorCode; error: string }
> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const candidates = await searchFinancePublicationDistributionPersonCandidates(
      prisma,
      workspace.ctx,
      { query: input.query },
    );
    return { ok: true, candidates };
  } catch (error: unknown) {
    logDistributionActionFailure("search-recipients", error);
    return {
      ok: false,
      errorCode: "LOAD_FAILED",
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}

export async function sendFinancePublicationDistributionAction(input: {
  publicationId: string;
  versionNumber: number;
  idempotencyKey: string;
  optionalMessage?: string | null;
  recipients: FinancePublicationDistributionRecipientInput[];
}): Promise<
  | {
      ok: true;
      distributionId: string;
      status: string;
      recipientCount: number;
      sentCount: number;
      failedCount: number;
      reused: boolean;
    }
  | { ok: false; errorCode: FinancePublicationDistributionActionErrorCode; error: string }
> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const locale = await getLocale();
    const result = await createFinancePublicationDistribution(prisma, workspace.ctx, {
      publicationId: input.publicationId,
      versionNumber: input.versionNumber,
      idempotencyKey: input.idempotencyKey,
      optionalMessage: input.optionalMessage,
      localeCode: locale,
      recipients: input.recipients,
      emailLabels: await loadDistributionEmailLabels(),
    });
    revalidatePath("/dashboard/finance/reports");
    return { ok: true, ...result };
  } catch (error: unknown) {
    logDistributionActionFailure("send", error);
    return {
      ok: false,
      errorCode: "SEND_FAILED",
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}

export async function loadFinancePublicationDistributionHistoryAction(input: {
  publicationId: string;
  versionNumber: number;
  cursorCreatedAt?: string | null;
}): Promise<
  | { ok: true; distributions: FinancePublicationDistributionSummary[]; hasOlder: boolean }
  | { ok: false; errorCode: FinancePublicationDistributionActionErrorCode; error: string }
> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const result = await listFinancePublicationDistributionSummariesForVersion(
      prisma,
      workspace.ctx,
      input,
    );
    return { ok: true, ...result };
  } catch (error: unknown) {
    logDistributionActionFailure("history", error);
    return {
      ok: false,
      errorCode: "LOAD_FAILED",
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}

export async function loadFinancePublicationDistributionDetailAction(input: {
  distributionId: string;
}): Promise<
  | { ok: true; detail: FinancePublicationDistributionDetail }
  | { ok: false; errorCode: FinancePublicationDistributionActionErrorCode; error: string }
> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const detail = await getFinancePublicationDistributionDetail(prisma, workspace.ctx, input);
    return { ok: true, detail };
  } catch (error: unknown) {
    logDistributionActionFailure("detail", error);
    return {
      ok: false,
      errorCode: "LOAD_FAILED",
      error: resolveFinancePublicationActionUserMessage(error),
    };
  }
}
