import { WorkspaceBackgroundJobType } from "@prisma/client";

export type WorkspaceMalwareScanVersionJobPayload = {
  v: 1;
  workspaceDocumentVersionId: string;
  workspaceDocumentId: string;
};

export type WorkspaceDocumentPurgeFinalizeJobPayload = {
  v: 1;
  workspaceDocumentId: string;
  /** Storage objects were already deleted or confirmed missing. */
  storagePhaseCompleted: boolean;
};

export type WorkspaceSubtreeOperationBatchJobPayload = {
  v: 1;
  operationId: string;
};

export type WorkspaceBackgroundJobPayloadByType = {
  [WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION]: WorkspaceMalwareScanVersionJobPayload;
  [WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE]: WorkspaceDocumentPurgeFinalizeJobPayload;
  [WorkspaceBackgroundJobType.SUBTREE_OPERATION_BATCH]: WorkspaceSubtreeOperationBatchJobPayload;
};

export type ParsedWorkspaceBackgroundJobPayload<
  T extends WorkspaceBackgroundJobType = WorkspaceBackgroundJobType,
> = WorkspaceBackgroundJobPayloadByType[T];

export class WorkspaceBackgroundJobPayloadError extends Error {
  readonly code = "INVALID_PAYLOAD" as const;

  constructor(message: string) {
    super(message);
    this.name = "WorkspaceBackgroundJobPayloadError";
  }
}

function requireNonEmptyId(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new WorkspaceBackgroundJobPayloadError(`${field} is required`);
  }
  return value.trim();
}

export function parseWorkspaceBackgroundJobPayload<T extends WorkspaceBackgroundJobType>(
  type: T,
  payloadJson: unknown,
): ParsedWorkspaceBackgroundJobPayload<T> {
  if (!payloadJson || typeof payloadJson !== "object") {
    throw new WorkspaceBackgroundJobPayloadError("payload must be an object");
  }

  const raw = payloadJson as Record<string, unknown>;

  switch (type) {
    case WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION: {
      const workspaceDocumentVersionId = requireNonEmptyId(
        raw.workspaceDocumentVersionId,
        "workspaceDocumentVersionId",
      );
      const workspaceDocumentId = requireNonEmptyId(
        raw.workspaceDocumentId,
        "workspaceDocumentId",
      );
      if (raw.v !== 1) {
        throw new WorkspaceBackgroundJobPayloadError("unsupported payload version");
      }
      return {
        v: 1,
        workspaceDocumentVersionId,
        workspaceDocumentId,
      } as ParsedWorkspaceBackgroundJobPayload<T>;
    }
    case WorkspaceBackgroundJobType.SUBTREE_OPERATION_BATCH: {
      const operationId = requireNonEmptyId(raw.operationId, "operationId");
      if (raw.v !== 1) {
        throw new WorkspaceBackgroundJobPayloadError("unsupported payload version");
      }
      return { v: 1, operationId } as ParsedWorkspaceBackgroundJobPayload<T>;
    }
    case WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE: {
      const workspaceDocumentId = requireNonEmptyId(
        raw.workspaceDocumentId,
        "workspaceDocumentId",
      );
      if (raw.v !== 1) {
        throw new WorkspaceBackgroundJobPayloadError("unsupported payload version");
      }
      if (typeof raw.storagePhaseCompleted !== "boolean") {
        throw new WorkspaceBackgroundJobPayloadError(
          "storagePhaseCompleted must be boolean",
        );
      }
      return {
        v: 1,
        workspaceDocumentId,
        storagePhaseCompleted: raw.storagePhaseCompleted,
      } as ParsedWorkspaceBackgroundJobPayload<T>;
    }
    default: {
      const _exhaustive: never = type;
      throw new WorkspaceBackgroundJobPayloadError(
        `Unknown job type: ${String(_exhaustive)}`,
      );
    }
  }
}

export function buildMalwareScanVersionDeduplicationKey(
  workspaceDocumentVersionId: string,
): string {
  return `MALWARE_SCAN_VERSION:${workspaceDocumentVersionId}`;
}

export function buildDocumentPurgeFinalizeDeduplicationKey(
  workspaceDocumentId: string,
): string {
  return `DOCUMENT_PURGE_FINALIZE:${workspaceDocumentId}`;
}

export function buildSubtreeOperationBatchDeduplicationKey(
  operationId: string,
): string {
  return `SUBTREE_OPERATION_BATCH:${operationId}`;
}

/** Payload must never carry storage locators, signed URLs, or secrets. */
export function assertWorkspaceBackgroundJobPayloadSafeForPersistence(
  payloadJson: unknown,
): void {
  const serialized = JSON.stringify(payloadJson).toLowerCase();
  const forbidden = [
    "storagekey",
    "storageurl",
    "signedurl",
    "presigned",
    "password",
    "secret",
    "authorization",
  ];
  for (const token of forbidden) {
    if (serialized.includes(token)) {
      throw new WorkspaceBackgroundJobPayloadError(
        `payload contains forbidden field token: ${token}`,
      );
    }
  }
}
