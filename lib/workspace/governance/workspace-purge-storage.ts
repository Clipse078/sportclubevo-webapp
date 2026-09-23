import type { PrismaClient } from "@prisma/client";

import { workspaceStorageProvider } from "@/lib/workspace/upload-storage";

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
      message: string;
    };

function isMissingObjectError(err: unknown): boolean {
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

/**
 * Deletes version storage keys when no other version row references the same key.
 * Missing objects are tolerated; provider failures fail closed.
 */
export async function purgeWorkspaceVersionStorageKeys(
  client: Pick<PrismaClient, "workspaceDocumentVersion">,
  tenantId: string,
  documentId: string,
  storageKeys: readonly string[],
): Promise<WorkspaceStoragePurgeResult> {
  const uniqueKeys = [...new Set(storageKeys.filter(Boolean))];
  const deletedKeys: string[] = [];
  const skippedMissingKeys: string[] = [];

  for (const storageKey of uniqueKeys) {
    const otherUsage = await client.workspaceDocumentVersion.count({
      where: {
        tenantId,
        storageKey,
        NOT: { documentId },
      },
    });

    if (otherUsage > 0) {
      return {
        ok: false,
        kind: "SHARED_OBJECT",
        storageKey,
        message: "Storage object is still referenced by another document version.",
      };
    }

    try {
      await workspaceStorageProvider.delete(storageKey);
      deletedKeys.push(storageKey);
    } catch (err) {
      if (isMissingObjectError(err)) {
        skippedMissingKeys.push(storageKey);
        continue;
      }
      return {
        ok: false,
        kind: "PROVIDER_FAILURE",
        storageKey,
        message: err instanceof Error ? err.message : "Storage provider failure.",
      };
    }
  }

  return { ok: true, deletedKeys, skippedMissingKeys };
}
