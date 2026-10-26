"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveFinancePublicationActionUserMessage } from "@/lib/finance/publishing/finance-publication-action-errors";
import {
  createFinancePublicationShare,
  ensureDefaultFinancePublicationShare,
  getActiveDefaultFinancePublicationShareLink,
  listFinancePublicationSharesForVersion,
  revokeFinancePublicationShare,
  type FinancePublicationShareListItem,
} from "@/lib/finance/services/finance-publication-share-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { revalidatePath } from "next/cache";

export type FinancePublicationShareActionErrorCode =
  | "CREATE_FAILED"
  | "LOAD_FAILED"
  | "REVOKE_FAILED"
  | "INVALID_EXPIRY";

export type CreateFinancePublicationShareActionResult =
  | {
      ok: true;
      shareId: string;
      shareUrlPath: string;
      expiresAt: string | null;
      versionNumber: number;
      reused: boolean;
    }
  | { ok: false; errorCode: FinancePublicationShareActionErrorCode; error: string };

function logShareActionFailure(scope: string, error: unknown): void {
  if (error instanceof FinanceDomainError) {
    console.error(`[finance-publication-share] ${scope}`, {
      code: error.code,
      status: error.status,
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[finance-publication-share] ${scope}`, {
      prismaCode: error.code,
      meta: error.meta,
    });
    return;
  }
  console.error(`[finance-publication-share] ${scope}`, {
    message: error instanceof Error ? error.message : "unknown",
  });
}

export async function ensureDefaultFinancePublicationShareAction(input: {
  publicationId: string;
  versionNumber: number;
}): Promise<CreateFinancePublicationShareActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const result = await ensureDefaultFinancePublicationShare(prisma, workspace.ctx, input);
    revalidatePath("/dashboard/finance/reports");
    return {
      ok: true,
      shareId: result.shareId,
      shareUrlPath: result.relativeSharePath,
      expiresAt: result.expiresAt,
      versionNumber: result.versionNumber,
      reused: result.reused,
    };
  } catch (error: unknown) {
    logShareActionFailure("ensure-default", error);
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        errorCode: "CREATE_FAILED",
        error: resolveFinancePublicationActionUserMessage(error),
      };
    }
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      error: "CREATE_FAILED",
    };
  }
}

export async function getDefaultFinancePublicationShareStatusAction(input: {
  publicationId: string;
  versionNumber: number;
}): Promise<
  | { ok: true; hasActiveDefault: boolean; shareUrlPath: string | null; versionNumber: number }
  | { ok: false; errorCode: FinancePublicationShareActionErrorCode; error: string }
> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const link = await getActiveDefaultFinancePublicationShareLink(prisma, workspace.ctx, input);
    return {
      ok: true,
      hasActiveDefault: Boolean(link),
      shareUrlPath: link?.relativeSharePath ?? null,
      versionNumber: input.versionNumber,
    };
  } catch (error: unknown) {
    logShareActionFailure("default-status", error);
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        errorCode: "LOAD_FAILED",
        error: resolveFinancePublicationActionUserMessage(error),
      };
    }
    return { ok: false, errorCode: "LOAD_FAILED", error: "LOAD_FAILED" };
  }
}

export async function createFinancePublicationShareAction(input: {
  publicationId: string;
  versionNumber: number;
  expiryMode: "NONE" | "DATE";
  expiresAtIso?: string | null;
}): Promise<CreateFinancePublicationShareActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    let expiresAt: Date | null = null;
    if (input.expiryMode === "DATE") {
      if (!input.expiresAtIso?.trim()) {
        return {
          ok: false,
          errorCode: "INVALID_EXPIRY",
          error: "INVALID_EXPIRY",
        };
      }
      expiresAt = new Date(input.expiresAtIso);
      if (Number.isNaN(expiresAt.getTime())) {
        return {
          ok: false,
          errorCode: "INVALID_EXPIRY",
          error: "INVALID_EXPIRY",
        };
      }
    }

    const result = await createFinancePublicationShare(prisma, workspace.ctx, {
      publicationId: input.publicationId,
      versionNumber: input.versionNumber,
      expiresAt,
      shareKind: input.expiryMode === "DATE" ? "ADVANCED" : "DEFAULT",
    });

    revalidatePath("/dashboard/finance/reports");

    return {
      ok: true,
      shareId: result.shareId,
      shareUrlPath: result.relativeSharePath,
      expiresAt: result.expiresAt,
      versionNumber: result.versionNumber,
      reused: result.reused,
    };
  } catch (error: unknown) {
    logShareActionFailure("create", error);
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        errorCode: "CREATE_FAILED",
        error: resolveFinancePublicationActionUserMessage(error),
      };
    }
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      error: "CREATE_FAILED",
    };
  }
}

export type ListFinancePublicationSharesActionResult =
  | { ok: true; shares: FinancePublicationShareListItem[] }
  | { ok: false; errorCode: FinancePublicationShareActionErrorCode; error: string };

export async function listFinancePublicationSharesAction(input: {
  publicationId: string;
  versionNumber: number;
}): Promise<ListFinancePublicationSharesActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const shares = await listFinancePublicationSharesForVersion(prisma, workspace.ctx, input);
    return { ok: true, shares };
  } catch (error: unknown) {
    logShareActionFailure("list", error);
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        errorCode: "LOAD_FAILED",
        error: resolveFinancePublicationActionUserMessage(error),
      };
    }
    return { ok: false, errorCode: "LOAD_FAILED", error: "LOAD_FAILED" };
  }
}

export type RevokeFinancePublicationShareActionResult =
  | { ok: true }
  | { ok: false; errorCode: FinancePublicationShareActionErrorCode; error: string };

export async function revokeFinancePublicationShareAction(input: {
  shareId: string;
}): Promise<RevokeFinancePublicationShareActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    await revokeFinancePublicationShare(prisma, workspace.ctx, { shareId: input.shareId });
    revalidatePath("/dashboard/finance/reports");
    return { ok: true };
  } catch (error: unknown) {
    logShareActionFailure("revoke", error);
    if (error instanceof FinanceDomainError) {
      return {
        ok: false,
        errorCode: "REVOKE_FAILED",
        error: resolveFinancePublicationActionUserMessage(error),
      };
    }
    return { ok: false, errorCode: "REVOKE_FAILED", error: "REVOKE_FAILED" };
  }
}
