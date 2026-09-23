import type { PrismaClient } from "@prisma/client";

import {
  normalizeWorkspaceStorageProviderId,
  type WorkspaceVersionStorageLocator,
} from "@/lib/workspace/storage/provider-identity";
import { getWorkspaceStorageProvider } from "@/lib/workspace/storage/workspace-storage-provider-registry";
import {
  isWorkspaceStorageNotFoundError,
  WorkspaceStorageOperationError,
} from "@/lib/workspace/storage/storage-errors";

export type WorkspaceStoragePurgeFailureKind =
  | "SHARED_OBJECT"
  | "PROVIDER_FAILURE"
  | "MISSING_OBJECT";

export type WorkspaceStoragePurgeResult =
  | { ok: true; deletedKeys: string[]; skippedMissingKeys: string[] }
  | {
      ok: false;
      kind: WorkspaceStoragePurgeFailureKind;
      storageKey?: string;
      storageProvider?: string;
      message: string;
    };

function isMissingObjectError(err: unknown): boolean {
  if (isWorkspaceStorageNotFoundError(err)) {
    return true;
  }
  if (!(err instanceof Error)) {
    return false;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("404") ||
    msg.includes("does not exist") ||
    err.name === "BlobNotFoundError"
  );
}

function dedupeLocators(
  locators: readonly WorkspaceVersionStorageLocator[],
): WorkspaceVersionStorageLocator[] {
  const seen = new Set<string>();
  const result: WorkspaceVersionStorageLocator[] = [];
  for (const locator of locators) {
    if (!locator.storageKey) {
      continue;
    }
    const provider = normalizeWorkspaceStorageProviderId(
      locator.storageProvider,
    );
    const key = `${provider}\0${locator.storageKey}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ storageProvider: provider, storageKey: locator.storageKey });
  }
  return result;
}

/**
 * Deletes version storage objects when no other version row references the same
 * (storageProvider, storageKey) pair. Missing objects are tolerated; provider
 * failures fail closed.
 */
export async function purgeWorkspaceVersionStorageKeys(
  client: Pick<PrismaClient, "workspaceDocumentVersion">,
  tenantId: string,
  documentId: string,
  locators: readonly WorkspaceVersionStorageLocator[],
): Promise<WorkspaceStoragePurgeResult> {
  const uniqueLocators = dedupeLocators(locators);
  const deletedKeys: string[] = [];
  const skippedMissingKeys: string[] = [];

  for (const locator of uniqueLocators) {
    const { storageProvider, storageKey } = locator;

    const otherUsage = await client.workspaceDocumentVersion.count({
      where: {
        tenantId,
        storageKey,
        storageProvider,
        NOT: { documentId },
      },
    });

    if (otherUsage > 0) {
      return {
        ok: false,
        kind: "SHARED_OBJECT",
        storageKey,
        storageProvider,
        message:
          "Storage object is still referenced by another document version.",
      };
    }

    const provider = getWorkspaceStorageProvider(storageProvider);

    try {
      await provider.delete(storageKey);
      deletedKeys.push(storageKey);
    } catch (err) {
      if (isMissingObjectError(err)) {
        skippedMissingKeys.push(storageKey);
        continue;
      }
      const message =
        err instanceof WorkspaceStorageOperationError
          ? err.errorClass
          : err instanceof Error
            ? err.message
            : "Storage provider failure.";
      return {
        ok: false,
        kind: "PROVIDER_FAILURE",
        storageKey,
        storageProvider,
        message,
      };
    }
  }

  return { ok: true, deletedKeys, skippedMissingKeys };
}
