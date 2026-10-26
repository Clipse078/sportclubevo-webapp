"use server";

import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveFinancePublicationActionUserMessage } from "@/lib/finance/publishing/finance-publication-action-errors";
import {
  createFinancePublicationShare,
  listFinancePublicationSharesForVersion,
  revokeFinancePublicationShare,
  type FinancePublicationShareListItem,
} from "@/lib/finance/services/finance-publication-share-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { revalidatePath } from "next/cache";

export type CreateFinancePublicationShareActionResult =
  | {
      ok: true;
      shareId: string;
      shareUrlPath: string;
      rawToken: string;
      expiresAt: string | null;
      versionNumber: number;
    }
  | { ok: false; error: string };

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
        return { ok: false, error: "Expiry date is required." };
      }
      expiresAt = new Date(input.expiresAtIso);
      if (Number.isNaN(expiresAt.getTime())) {
        return { ok: false, error: "Invalid expiry date." };
      }
    }

    const result = await createFinancePublicationShare(prisma, workspace.ctx, {
      publicationId: input.publicationId,
      versionNumber: input.versionNumber,
      expiresAt,
    });

    revalidatePath("/dashboard/finance/reports");

    return {
      ok: true,
      shareId: result.shareId,
      shareUrlPath: result.relativeSharePath,
      rawToken: result.rawToken,
      expiresAt: result.expiresAt,
      versionNumber: result.versionNumber,
    };
  } catch (error: unknown) {
    if (error instanceof FinanceDomainError) {
      return { ok: false, error: resolveFinancePublicationActionUserMessage(error) };
    }
    return { ok: false, error: "Share could not be created." };
  }
}

export type ListFinancePublicationSharesActionResult =
  | { ok: true; shares: FinancePublicationShareListItem[] }
  | { ok: false; error: string };

export async function listFinancePublicationSharesAction(input: {
  publicationId: string;
  versionNumber: number;
}): Promise<ListFinancePublicationSharesActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const shares = await listFinancePublicationSharesForVersion(prisma, workspace.ctx, input);
    return { ok: true, shares };
  } catch (error: unknown) {
    if (error instanceof FinanceDomainError) {
      return { ok: false, error: resolveFinancePublicationActionUserMessage(error) };
    }
    return { ok: false, error: "Shares could not be loaded." };
  }
}

export type RevokeFinancePublicationShareActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function revokeFinancePublicationShareAction(input: {
  shareId: string;
}): Promise<RevokeFinancePublicationShareActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    await revokeFinancePublicationShare(prisma, workspace.ctx, { shareId: input.shareId });
    revalidatePath("/dashboard/finance/reports");
    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof FinanceDomainError) {
      return { ok: false, error: resolveFinancePublicationActionUserMessage(error) };
    }
    return { ok: false, error: "Share could not be revoked." };
  }
}
